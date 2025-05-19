class CombatSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }
  
  initiateCombat(square) {
    const gangsPresent = Object.keys(square.gangMembers).filter(
      gangId => square.gangMembers[gangId].length > 0
    );
    
    if (gangsPresent.length <= 1) return null; // No combat needed
    
    const combatLog = {
      location: square,
      rounds: [],
      casualties: [],
      victor: null
    };
    
    // Continue combat until only one gang remains
    while (this.getActiveGangsInSquare(square).length > 1) {
      const roundResult = this.resolveCombatRound(square);
      combatLog.rounds.push(roundResult);
      
      // Add casualties to the log
      roundResult.casualties.forEach(casualty => {
        combatLog.casualties.push(casualty);
      });
      
      // Check if combat is over
      const remainingGangs = this.getActiveGangsInSquare(square);
      if (remainingGangs.length === 1) {
        combatLog.victor = remainingGangs[0];
        
        // Set territory control
        square.controlledBy = combatLog.victor;
        const victorGang = this.gameState.gangs.find(g => g.id === combatLog.victor);
        if (victorGang && !victorGang.controlledTerritories.includes(square)) {
          victorGang.controlledTerritories.push(square);
        }
      }
    }
    
    // Increase heat level for the square based on combat intensity
    square.heatLevel += combatLog.rounds.length;
    
    return combatLog;
  }
  
  resolveCombatRound(square) {
    const roundResult = {
      attackers: [],
      defenders: [],
      outcomes: [],
      casualties: []
    };
    
    // Group members by gang
    const gangMembers = {};
    Object.keys(square.gangMembers).forEach(gangId => {
      if (square.gangMembers[gangId].length > 0) {
        gangMembers[gangId] = square.gangMembers[gangId];
      }
    });
    
    // Determine attack order (random for simplicity)
    const gangIds = Object.keys(gangMembers);
    const attackOrder = [...gangIds].sort(() => Math.random() - 0.5);
    
    // Each gang attacks another gang
    for (let i = 0; i < attackOrder.length; i++) {
      const attackerGangId = attackOrder[i];
      const defenderGangId = attackOrder[(i + 1) % attackOrder.length];
      
      // Skip if either gang has been eliminated
      if (!gangMembers[attackerGangId] || !gangMembers[defenderGangId]) continue;
      
      // Each member of attacking gang targets a random member of defending gang
      gangMembers[attackerGangId].forEach(attacker => {
        // Skip if attacker is dead
        if (attacker.lives <= 0) return;
        
        // Pick a random defender
        const availableDefenders = gangMembers[defenderGangId].filter(m => m.lives > 0);
        if (availableDefenders.length === 0) return;
        
        const defender = availableDefenders[Math.floor(Math.random() * availableDefenders.length)];
        
        // Resolve the attack
        const combatResult = this.resolveIndividualCombat(attacker, defender, square);
        
        roundResult.attackers.push({
          gangId: attackerGangId,
          memberId: attacker.id,
          effectiveness: combatResult.attackerEffectiveness,
          roll: combatResult.attackerRoll
        });
        
        roundResult.defenders.push({
          gangId: defenderGangId,
          memberId: defender.id,
          effectiveness: combatResult.defenderEffectiveness,
          roll: combatResult.defenderRoll
        });
        
        roundResult.outcomes.push({
          winner: combatResult.winner,
          loser: combatResult.loser
        });
        
        // Check for casualties
        if (combatResult.casualty) {
          roundResult.casualties.push(combatResult.casualty);
          
          // Remove dead member
          if (combatResult.casualty.lives <= 0) {
            const gangId = combatResult.casualty.gangId;
            const index = square.gangMembers[gangId].findIndex(m => m.id === combatResult.casualty.id);
            if (index >= 0) {
              square.gangMembers[gangId].splice(index, 1);
            }
            
            // If this was the boss, check for game end condition
            if (combatResult.casualty.type === 'boss') {
              this.gameState.checkForBossElimination(gangId);
            }
          }
        }
      });
    }
    
    return roundResult;
  }
  
  resolveIndividualCombat(attacker, defender, square) {
    const result = {
      attackerEffectiveness: attacker.getCombatEffectiveness(),
      defenderEffectiveness: defender.getCombatEffectiveness(),
      attackerRoll: Math.floor(Math.random() * 10) + 1, // 1-10
      defenderRoll: Math.floor(Math.random() * 10) + 1, // 1-10
      winner: null,
      loser: null,
      casualty: null
    };
    
    // Apply location bonuses
    if (square.borough) {
      // Brooklyn gives combat bonus
      if (square.borough === 'brooklyn') {
        // Check if either fighter is from a gang with 'localKnowledge'
        const attackerGang = this.gameState.gangs.find(g => g.id === attacker.gangId);
        const defenderGang = this.gameState.gangs.find(g => g.id === defender.gangId);
        
        if (attackerGang.specialAbilities.includes('localKnowledge') && square.borough === 'brooklyn') {
          result.attackerEffectiveness += 1;
        }
        
        if (defenderGang.specialAbilities.includes('localKnowledge') && square.borough === 'brooklyn') {
          result.defenderEffectiveness += 1;
        }
      }
    }
    
    // Calculate total combat scores
    const attackerTotal = result.attackerEffectiveness + result.attackerRoll;
    const defenderTotal = result.defenderEffectiveness + result.defenderRoll;
    
    // Determine winner
    if (attackerTotal > defenderTotal) {
      result.winner = attacker;
      result.loser = defender;
      const isDead = defender.takeDamage();
      if (isDead) {
        result.casualty = {
          id: defender.id,
          gangId: defender.gangId,
          type: defender.type,
          lives: 0
        };
      }
    } else {
      result.winner = defender;
      result.loser = attacker;
      const isDead = attacker.takeDamage();
      if (isDead) {
        result.casualty = {
          id: attacker.id,
          gangId: attacker.gangId,
          type: attacker.type,
          lives: 0
        };
      }
    }
    
    return result;
  }
  
  getActiveGangsInSquare(square) {
    return Object.keys(square.gangMembers).filter(
      gangId => square.gangMembers[gangId].length > 0
    );
  }
}
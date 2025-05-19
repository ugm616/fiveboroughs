class FiveBoroughs {
  constructor() {
    this.board = null;
    this.gangs = [];
    this.police = null;
    this.economy = null;
    this.combat = null;
    this.events = null;
    this.playerGang = null;
    this.turnNumber = 1;
    this.gamePhase = 'setup'; // setup, income, action, event, end
    this.actionsRemaining = 0;
    this.eventLog = [];
    this.gameStatus = 'active'; // active, victory, defeat
    this.victoryType = null;
    this.saveSystem = new SaveSystem(this);
  }
  
  startNewGame(selectedGangId) {
    // Initialize game components
    this.board = new GameBoard();
    this.police = new Police(this);
    this.economy = new EconomySystem(this);
    this.events = new EventSystem(this);
    
    // Create gangs
    gangTypes.forEach(gangType => {
      const gang = new Gang(
        gangType.id, 
        gangType.name, 
        gangType.description,
        gangType.color, 
        gangType.specialAbilities
      );
      
      gang.initializeStartingResources();
      this.gangs.push(gang);
      
      // Set the player's gang
      if (gangType.id === selectedGangId) {
        gang.isPlayerControlled = true;
        this.playerGang = gang;
      }
    });
    
    // Initialize the board
    this.placeGangsOnBoard();
    this.police.initialize(this.board);
    
    // Initialize combat system
    this.combat = new CombatSystem(this);
    
    // Set up UI
    this.ui = new GameUI(this);
    this.ui.initialize();
    
    // Start first turn
    this.gamePhase = 'income';
    this.processIncomePhase();
  }
  
  placeGangsOnBoard() {
    // Find valid starting positions (at least 2 squares apart)
    const positions = [];
    
    // Try to position gangs in different boroughs if possible
    const boroughs = Object.keys(this.board.boroughs);
    
    this.gangs.forEach((gang, index) => {
      let position;
      
      if (index < boroughs.length) {
        // Place in different boroughs
        const boroughSquares = this.board.boroughs[boroughs[index]].squares;
        const validSquares = boroughSquares.filter(square => {
          // Check distance from existing gang positions
          return positions.every(pos => {
            const distance = Math.abs(pos.x - square.x) + Math.abs(pos.y - square.y);
            return distance > 2;
          });
        });
        
        if (validSquares.length > 0) {
          position = validSquares[Math.floor(Math.random() * validSquares.length)];
        }
      }
      
      // If no position found yet, find any valid position
      if (!position) {
        const validSquares = this.board.squares.filter(square => {
          // Must not be a special location
          if (square.specialLocation) return false;
          
          // Check distance from existing gang positions
          return positions.every(pos => {
            const distance = Math.abs(pos.x - square.x) + Math.abs(pos.y - square.y);
            return distance > 2;
          });
        });
        
        position = validSquares[Math.floor(Math.random() * validSquares.length)];
      }
      
      positions.push(position);
      gang.placeBoss(position);
    });
  }
  
  processIncomePhase() {
    this.gamePhase = 'income';
    this.eventLog.push({
      type: 'phase',
      phase: 'income',
      turnNumber: this.turnNumber
    });
    
    // Process income for all gangs
    this.gangs.forEach(gang => {
      const territoryIncome = this.economy.processTerritoryIncome(gang);
      const businessResult = this.economy.processBusinessIncome(gang);
      
      this.eventLog.push({
        type: 'income',
        gangId: gang.id,
        territoryIncome: territoryIncome,
        businessIncome: businessResult.income,
        businessHeat: businessResult.heat,
        totalMoney: gang.money
      });
    });
    
    // If this is the player's gang, update UI
    if (this.playerGang) {
      this.ui.updateMoneyDisplay(this.playerGang.money);
      this.ui.showPhaseMessage('Income Phase', 'You earned money from your territories and businesses.');
    }
    
    // Move to the next phase
    setTimeout(() => this.processHeatPhase(), 1500);
  }
  
  processHeatPhase() {
    this.gamePhase = 'heat';
    this.eventLog.push({
      type: 'phase',
      phase: 'heat',
      turnNumber: this.turnNumber
    });
    
    // Process police actions based on heat levels
    this.police.processTurn();
    
    // Reduce heat naturally
    this.gangs.forEach(gang => {
      gang.heatLevel = Math.max(0, gang.heatLevel - 1);
    });
    
    this.board.squares.forEach(square => {
      if (square.heatLevel > 0) {
        square.heatLevel -= 1;
      }
    });
    
    // Check for police victory
    if (this.police.checkVictoryConditions()) {
      this.endGame('police');
      return;
    }
    
    // Update UI if player's gang
    if (this.playerGang) {
      this.ui.updateHeatDisplay(this.playerGang.heatLevel);
      this.ui.showPhaseMessage('Heat Phase', 'Police have conducted their operations.');
    }
    
    // Move to the next phase
    setTimeout(() => this.startActionPhase(), 1500);
  }
  
  startActionPhase() {
    this.gamePhase = 'action';
    this.actionsRemaining = 5; // 5 actions per turn
    
    this.eventLog.push({
      type: 'phase',
      phase: 'action',
      turnNumber: this.turnNumber,
      actionsRemaining: this.actionsRemaining
    });
    
    // If player's turn, enable action UI
    if (this.playerGang) {
      this.ui.updateActionDisplay(this.actionsRemaining);
      this.ui.enableActionButtons(true);
      this.ui.showPhaseMessage('Action Phase', 'Take your actions (5 total).');
    } else {
      // Process AI actions for all computer gangs
      this.processAIActions();
    }
  }
  
  processPlayerAction(actionType, params) {
    // Ensure it's the player's turn and they have actions left
    if (this.gamePhase !== 'action' || this.actionsRemaining <= 0) {
      return { success: false, reason: 'No actions remaining or wrong phase' };
    }
    
    let result = { success: false, reason: 'Invalid action' };
    
    switch(actionType) {
      case 'move':
        result = this.moveGangMember(this.playerGang, params.memberId, params.targetSquare);
        break;
      case 'recruit':
        result = this.recruitGangMember(this.playerGang, params.atHomeBase, params.isPaid);
        break;
      case 'deal':
        result = params.isBuying ? 
                this.economy.buyDrugs(this.playerGang, params.drugType, params.quantity) :
                this.economy.sellDrugs(this.playerGang, params.drugType, params.quantity);
        break;
      case 'arm':
        result = this.economy.buyWeapon(this.playerGang, params.weaponType);
        break;
      case 'establish':
        result = this.economy.establishBusiness(this.playerGang, params.businessType, params.square);
        break;
      case 'heal':
        result = this.healGangMember(this.playerGang, params.memberId);
        break;
      case 'attack':
        result = this.initiateAttack(this.playerGang, params.attackerId, params.targetId);
        break;
    }
    
    if (result.success) {
      this.actionsRemaining--;
      this.ui.updateActionDisplay(this.actionsRemaining);
      
      // Log the action
      this.eventLog.push({
        type: 'action',
        gangId: this.playerGang.id,
        actionType: actionType,
        params: params,
        result: result,
        turnNumber: this.turnNumber
      });
      
      // Check if actions are exhausted
      if (this.actionsRemaining <= 0) {
        this.ui.enableActionButtons(false);
        this.endActionPhase();
      }
      
      // Update UI
      this.ui.updateBoardDisplay();
      this.ui.updateGangDisplay(this.playerGang);
    }
    
    return result;
  }
  
  processAIActions() {
    // Process actions for all AI-controlled gangs
    this.gangs.forEach(gang => {
      if (!gang.isPlayerControlled) {
        // Each AI gang gets 5 actions
        for (let i = 0; i < 5; i++) {
          gang.calculateNextMove(this);
          
          // Check for victory conditions after each AI action
          if (this.checkVictoryConditions()) {
            return;
          }
        }
      }
    });
    
    // Move to the next phase
    this.endActionPhase();
  }
  
  endActionPhase() {
    // Process combat in all squares with multiple gangs
    this.board.squares.forEach(square => {
      const gangsPresent = Object.keys(square.gangMembers).filter(
        gangId => square.gangMembers[gangId].length > 0
      );
      
      if (gangsPresent.length > 1) {
        const combatResult = this.combat.initiateCombat(square);
        
        if (combatResult) {
          this.eventLog.push({
            type: 'combat',
            location: { x: square.x, y: square.y },
            result: combatResult,
            turnNumber: this.turnNumber
          });
        }
      }
    });
    
    // Check victory conditions
    if (this.checkVictoryConditions()) {
      return;
    }
    
    // Move to event phase
    setTimeout(() => this.processEventPhase(), 1500);
  }
  
  processEventPhase() {
    this.gamePhase = 'event';
    
    this.eventLog.push({
      type: 'phase',
      phase: 'event',
      turnNumber: this.turnNumber
    });
    
    // Process existing events and possibly draw a new one
    const drawnEvent = this.events.processTurn();
    
    if (drawnEvent) {
      this.eventLog.push({
        type: 'event',
        eventId: drawnEvent.id,
        name: drawnEvent.name,
        description: drawnEvent.description,
        duration: drawnEvent.duration,
        turnNumber: this.turnNumber
      });
      
      // Update UI
      this.ui.showEventMessage(drawnEvent.name, drawnEvent.description);
    }
    
    // Update drug market prices
    this.economy.drugMarket.updatePrices();
    
    // End turn and start next
    setTimeout(() => this.endTurn(), 2000);
  }
  
  endTurn() {
    this.gamePhase = 'end';
    
    // Check victory conditions one last time
    if (this.checkVictoryConditions()) {
      return;
    }
    
    // Start the next turn
    this.turnNumber++;
    setTimeout(() => this.processIncomePhase(), 1500);
  }
  
  checkVictoryConditions() {
    // Check for boss elimination victory
    const gangsWithBosses = this.gangs.filter(gang => gang.boss && gang.boss.lives > 0);
    
    if (gangsWithBosses.length === 1) {
      // One gang's boss remains - they win
      this.endGame('bossElimination', gangsWithBosses[0].id);
      return true;
    }
    
    // Check for territory dominance (75% of the board)
    this.gangs.forEach(gang => {
      const controlledCount = gang.controlledTerritories.length;
      const totalSquares = this.board.squares.length;
      
      if (controlledCount >= totalSquares * 0.75) {
        this.endGame('territoryDominance', gang.id);
        return true;
      }
    });
    
    // Check for economic victory ($10,000 and territory in each borough)
    this.gangs.forEach(gang => {
      if (gang.money >= 10000) {
        // Check for territory in each borough
        const boroughs = Object.keys(this.board.boroughs);
        const hasAllBoroughs = boroughs.every(borough => {
          return gang.controlledTerritories.some(square => square.borough === borough);
        });
        
        if (hasAllBoroughs) {
          this.endGame('economic', gang.id);
          return true;
        }
      }
    });
    
    // Check for police victory
    if (this.police.checkVictoryConditions()) {
      this.endGame('police');
      return true;
    }
    
    return false;
  }
  
  endGame(victoryType, gangId = null) {
    this.gameStatus = gangId === this.playerGang?.id ? 'victory' : 'defeat';
    this.victoryType = victoryType;
    this.gamePhase = 'gameOver';
    
    // Log the game end
    this.eventLog.push({
      type: 'gameOver',
      victoryType: victoryType,
      victorId: gangId,
      turnNumber: this.turnNumber
    });
    
    // Update UI
    this.ui.showGameOverScreen(this.gameStatus, this.victoryType, gangId);
  }
  
  // Assorted game action methods
  moveGangMember(gang, memberId, targetSquare) {
    // Find the member
    const member = gang.members.find(m => m.id === memberId) || 
                  (gang.boss && gang.boss.id === memberId ? gang.boss : null);
    
    if (!member) {
      return { success: false, reason: 'Gang member not found' };
    }
    
    // Get the current square
    const currentSquare = member.square;
    if (!currentSquare) {
      return { success: false, reason: 'Member not on board' };
    }
    
    // Check if target is adjacent
    const distance = Math.abs(currentSquare.x - targetSquare.x) + Math.abs(currentSquare.y - targetSquare.y);
    let maxDistance = 1; // Default 1 square
    
    // Road Warriors ability allows 2 square movement
    if (gang.specialAbilities.includes('roadWarriors')) {
      maxDistance = gang.applySpecialAbility('roadWarriors', { movementPoints: maxDistance });
    }
    
    if (distance > maxDistance) {
      return { success: false, reason: 'Target square too far away' };
    }
    
    // Boss can't leave home base
    if (member.type === 'boss' && currentSquare === gang.homeBase) {
      return { success: false, reason: 'Boss cannot leave home base' };
    }
    
    // Remove from current square
    const gangMembers = currentSquare.gangMembers[gang.id];
    const memberIndex = gangMembers.findIndex(m => m.id === member.id);
    gangMembers.splice(memberIndex, 1);
    
    // Add to new square
    targetSquare.gangMembers[gang.id] = targetSquare.gangMembers[gang.id] || [];
    targetSquare.gangMembers[gang.id].push(member);
    member.square = targetSquare;
    
    // If no gang members remain in the old square, check control
    if (gangMembers.length === 0) {
      if (currentSquare.controlledBy === gang.id) {
        currentSquare.controlledBy = null;
        // Remove from gang's controlled territories
        const territoryIndex = gang.controlledTerritories.indexOf(currentSquare);
        if (territoryIndex >= 0) {
          gang.controlledTerritories.splice(territoryIndex, 1);
        }
      }
    }
    
    // Check if this square is uncontrolled or belongs to another gang
    if (!targetSquare.controlledBy) {
      targetSquare.controlledBy = gang.id;
      gang.controlledTerritories.push(targetSquare);
    }
    
    return { 
      success: true,
      member: member.id,
      from: { x: currentSquare.x, y: currentSquare.y },
      to: { x: targetSquare.x, y: targetSquare.y }
    };
  }
  
  recruitGangMember(gang, atHomeBase = true, isPaid = true) {
    // Check if recruiting at home base (required for paid members)
    if (isPaid && !atHomeBase) {
      return { success: false, reason: 'Paid members must be recruited at home base' };
    }
    
    // Check cost
    let cost = isPaid ? 100 : 0;
    
    // Apply recruitment drive discount if applicable
    if (isPaid && gang.specialAbilities.includes('recruitmentDrive')) {
      cost = Math.floor(cost * 0.75); // 25% discount
    }
    
    // Check if gang can afford it
    if (isPaid && gang.money < cost) {
      return { success: false, reason: 'Not enough money' };
    }
    
    // For unpaid recruitment, need to roll for success
    if (!isPaid) {
      const baseChance = 0.4; // 40% base success chance
      const roll = Math.random();
      
      // Intimidation ability improves recruitment chance
      let successChance = baseChance;
      if (gang.specialAbilities.includes('intimidation')) {
        successChance += 0.2; // +20% chance
      }
      
      // Borough bonus in Bronx
      const recruitSquare = atHomeBase ? gang.homeBase : gang.members[0]?.square;
      if (recruitSquare && recruitSquare.borough === 'bronx') {
        successChance += 0.1; // +10% in Bronx
      }
      
      if (roll > successChance) {
        return { success: false, reason: 'Failed to persuade local to join' };
      }
    }
    
    // Deduct cost if paid
    if (isPaid) {
      gang.money -= cost;
    }
    
    // Create new member
    const newMember = gang.recruitMember(isPaid);
    
    // Add to square
    const square = atHomeBase ? gang.homeBase : gang.members[0]?.square;
    if (square) {
      square.gangMembers[gang.id] = square.gangMembers[gang.id] || [];
      square.gangMembers[gang.id].push(newMember);
      newMember.square = square;
    }
    
    // Apply Code of Honor ability if applicable
    if (gang.specialAbilities.includes('codeOfHonor')) {
      gang.applySpecialAbility('codeOfHonor', { type: 'newMember', member: newMember });
    }
    
    return { 
      success: true, 
      cost: cost, 
      memberId: newMember.id, 
      isPaid: isPaid,
      lives: newMember.lives
    };
  }
  
  healGangMember(gang, memberId) {
    // Find the member
    const member = gang.members.find(m => m.id === memberId) || 
                  (gang.boss.id === memberId ? gang.boss : null);
    
    if (!member) {
      return { success: false, reason: 'Gang member not found' };
    }
    
    // Check if already at max health
    if (member.lives >= member.maxLives) {
      return { success: false, reason: 'Member already at full health' };
    }
    
    // Check if at hospital or home base
    const isAtHealingLocation = 
      (member.square.specialLocation === 'hospital') ||
      (member.square === gang.homeBase);
    
    if (!isAtHealingLocation) {
      return { success: false, reason: 'Must be at hospital or home base to heal' };
    }
    
    // Perform healing
    const healed = member.heal();
    if (!healed) {
      return { success: false, reason: 'Could not heal member' };
    }
    
    return { 
      success: true, 
      memberId: member.id, 
      newLives: member.lives,
      maxLives: member.maxLives 
    };
  }
  
  initiateAttack(gang, attackerId, targetId) {
    // Find the attacker
    const attacker = gang.members.find(m => m.id === attackerId) || 
                    (gang.boss && gang.boss.id === attackerId ? gang.boss : null);
    
    if (!attacker) {
      return { success: false, reason: 'Attacker not found' };
    }
    
    // Get the current square
    const square = attacker.square;
    if (!square) {
      return { success: false, reason: 'Attacker not on board' };
    }
    
    // Find the target (must be in same square)
    let target = null;
    let targetGang = null;
    
    for (const gangId in square.gangMembers) {
      if (gangId === gang.id) continue; // Skip own gang
      
      const members = square.gangMembers[gangId];
      const foundTarget = members.find(m => m.id === targetId);
      
      if (foundTarget) {
        target = foundTarget;
        targetGang = this.gangs.find(g => g.id === gangId);
        break;
      }
    }
    
    if (!target || !targetGang) {
      return { success: false, reason: 'Target not found in square' };
    }
    
    // Resolve individual combat
    const combatResult = this.combat.resolveIndividualCombat(attacker, target, square);
    
    // Check if this results in a casualty
    if (combatResult.casualty) {
      const casualty = combatResult.casualty;
      
      // If the member died, remove them
      if (casualty.lives <= 0) {
        const gangId = casualty.gangId;
        const gang = this.gangs.find(g => g.id === gangId);
        
        // Remove from square
        const index = square.gangMembers[gangId].findIndex(m => m.id === casualty.id);
        if (index >= 0) {
          square.gangMembers[gangId].splice(index, 1);
        }
        
        // Remove from gang
        if (gang) {
          if (casualty.type === 'boss') {
            gang.boss = null;
          } else {
            const memberIndex = gang.members.findIndex(m => m.id === casualty.id);
            if (memberIndex >= 0) {
              gang.members.splice(memberIndex, 1);
            }
          }
        }
        
        // Check for boss elimination
        if (casualty.type === 'boss') {
          this.checkForBossElimination(gangId);
        }
      }
    }
    
    return {
      success: true,
      combatResult: combatResult,
      attackerId: attacker.id,
      targetId: target.id,
      winner: combatResult.winner.id,
      loser: combatResult.loser.id,
      casualty: combatResult.casualty
    };
  }
  
  checkForBossElimination(gangId) {
    const gang = this.gangs.find(g => g.id === gangId);
    if (!gang) return false;
    
    // Check if boss is eliminated
    if (!gang.boss || gang.boss.lives <= 0) {
      // Check for victory conditions
      return this.checkVictoryConditions();
    }
    
    return false;
  }
}

// Factory for creating weapons
class WeaponFactory {
  static createWeapon(type) {
    const weapons = {
      'knife': { id: 'knife', name: 'Knife', combatBonus: 1, cost: 50, type: 'weapon' },
      'bat': { id: 'bat', name: 'Baseball Bat', combatBonus: 1, cost: 75, type: 'weapon' },
      'chain': { id: 'chain', name: 'Chain', combatBonus: 1, cost: 60, type: 'weapon' },
      'pistol': { id: 'pistol', name: 'Pistol', combatBonus: 2, cost: 200, type: 'weapon' },
      'shotgun': { id: 'shotgun', name: 'Shotgun', combatBonus: 3, cost: 350, type: 'weapon' },
      'katana': { id: 'katana', name: 'Katana', combatBonus: 3, cost: 400, type: 'weapon' },
      'smg': { id: 'smg', name: 'SMG', combatBonus: 3, cost: 500, type: 'weapon' },
      'rifle': { id: 'rifle', name: 'Assault Rifle', combatBonus: 4, cost: 750, type: 'weapon' },
      'grenade': { id: 'grenade', name: 'Grenade', combatBonus: 5, cost: 1000, type: 'weapon', blackMarketOnly: true },
      'bodyArmor': { id: 'bodyArmor', name: 'Body Armor', combatBonus: 2, defensiveBonus: 3, cost: 600, type: 'armor', blackMarketOnly: true }
    };
    
    const weapon = weapons[type];
    if (!weapon) return null;
    
    // Create a unique instance
    return {
      ...weapon,
      id: `${weapon.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
  }
}
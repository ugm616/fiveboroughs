class Police {
  constructor(gameState) {
    this.gameState = gameState;
    this.units = [];
    this.stations = [];
    this.heatThreshold = 3; // Heat level that triggers police action
    this.budget = 1000;
    this.arrestCount = 0;
  }
  
  initialize(board) {
    // Find police stations on the board
    board.squares.forEach(square => {
      if (square.specialLocation === 'policeStation') {
        this.stations.push(square);
        
        // Deploy initial police units
        for (let i = 0; i < 2; i++) {
          this.deployUnit(square);
        }
      }
    });
  }
  
  deployUnit(square) {
    const unit = {
      id: `police-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      square: square,
      effectiveness: 7, // Police are more effective than average gang members
      isPatrolling: true
    };
    
    this.units.push(unit);
    
    // Add to square's occupants
    square.policeUnits = square.policeUnits || [];
    square.policeUnits.push(unit);
    
    return unit;
  }
  
  processTurn() {
    // Generate income (budget)
    this.budget += 300;
    
    // Deploy new units if budget allows
    if (this.budget >= 200 && this.units.length < 10) {
      const randomStation = this.stations[Math.floor(Math.random() * this.stations.length)];
      this.deployUnit(randomStation);
      this.budget -= 200;
    }
    
    // Process each police unit's actions
    this.units.forEach(unit => {
      if (unit.isPatrolling) {
        this.patrolAction(unit);
      }
    });
  }
  
  patrolAction(unit) {
    // Find neighboring squares
    const neighbors = this.gameState.board.getNeighbors(unit.square);
    
    // Prioritize squares with high heat levels
    neighbors.sort((a, b) => b.heatLevel - a.heatLevel);
    
    // Move to the highest heat square or stay if current square has high heat
    let targetSquare = neighbors[0];
    if (unit.square.heatLevel >= this.heatThreshold && unit.square.heatLevel >= targetSquare.heatLevel) {
      targetSquare = unit.square; // Stay in current high-heat square
    }
    
    // Move the unit
    if (targetSquare !== unit.square) {
      // Remove from current square
      const index = unit.square.policeUnits.findIndex(u => u.id === unit.id);
      if (index >= 0) {
        unit.square.policeUnits.splice(index, 1);
      }
      
      // Add to new square
      unit.square = targetSquare;
      targetSquare.policeUnits = targetSquare.policeUnits || [];
      targetSquare.policeUnits.push(unit);
    }
    
    // Check for arrests
    this.attemptArrests(unit, targetSquare);
  }
  
  attemptArrests(policeUnit, square) {
    // Police only act if heat is above threshold
    if (square.heatLevel < this.heatThreshold) return;
    
    // Check each gang in the square
    Object.keys(square.gangMembers).forEach(gangId => {
      const gangMembers = square.gangMembers[gangId];
      if (!gangMembers || gangMembers.length === 0) return;
      
      // Chance of arrest increases with heat level
      const arrestChance = Math.min(0.7, 0.2 + (square.heatLevel * 0.1));
      
      // Try to arrest members
      gangMembers.forEach(member => {
        // Bosses are harder to arrest
        const memberArrestChance = member.type === 'boss' ? arrestChance * 0.3 : arrestChance;
        
        if (Math.random() < memberArrestChance) {
          // Arrest successful
          this.arrestMember(member, square, gangId);
        }
      });
    });
    
    // Reduce heat level slightly after police action
    square.heatLevel = Math.max(0, square.heatLevel - 1);
  }
  
  arrestMember(member, square, gangId) {
    // Remove member from gang and square
    const gang = this.gameState.gangs.find(g => g.id === gangId);
    if (!gang) return;
    
    // Remove from square
    const squareIndex = square.gangMembers[gangId].findIndex(m => m.id === member.id);
    if (squareIndex >= 0) {
      square.gangMembers[gangId].splice(squareIndex, 1);
    }
    
    // Remove from gang members list
    const gangIndex = gang.members.findIndex(m => m.id === member.id);
    if (gangIndex >= 0) {
      gang.members.splice(gangIndex, 1);
    }
    
    // If this was the boss, check for game end condition
    if (member.type === 'boss') {
      this.gameState.checkForBossElimination(gangId);
    }
    
    this.arrestCount++;
    
    // Create an arrest event
    const arrestEvent = {
      type: 'arrest',
      gangId: gangId,
      memberId: member.id,
      memberType: member.type,
      location: square,
      turnNumber: this.gameState.turnNumber
    };
    
    this.gameState.eventLog.push(arrestEvent);
    
    return arrestEvent;
  }
  
  // Check victory conditions for police
  checkVictoryConditions() {
    // Police win if all gang bosses are arrested/eliminated
    const remainingBosses = this.gameState.gangs.filter(gang => {
      return gang.boss && gang.boss.lives > 0;
    });
    
    if (remainingBosses.length === 0) {
      return true;
    }
    
    return false;
  }
}
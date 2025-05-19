class SaveSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }
  
  saveGame() {
    const saveData = {
      turnNumber: this.gameState.turnNumber,
      gamePhase: this.gameState.gamePhase,
      actionsRemaining: this.gameState.actionsRemaining,
      gameStatus: this.gameState.gameStatus,
      victoryType: this.gameState.victoryType,
      playerGangId: this.gameState.playerGang?.id,
      board: this.serializeBoard(),
      gangs: this.serializeGangs(),
      events: this.serializeEvents(),
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    try {
      localStorage.setItem('fiveBoroughs_saveGame', JSON.stringify(saveData));
      return { success: true };
    } catch (e) {
      console.error("Failed to save game:", e);
      return { success: false, error: e.message };
    }
  }
  
  loadGame() {
    try {
      const saveData = JSON.parse(localStorage.getItem('fiveBoroughs_saveGame'));
      if (!saveData) {
        return { success: false, error: 'No saved game found' };
      }
      
      // Recreate the game state
      this.deserializeGameState(saveData);
      return { success: true };
    } catch (e) {
      console.error("Failed to load game:", e);
      return { success: false, error: e.message };
    }
  }
  
  hasSaveGame() {
    return !!localStorage.getItem('fiveBoroughs_saveGame');
  }
  
  deleteSaveGame() {
    localStorage.removeItem('fiveBoroughs_saveGame');
  }
  
  serializeBoard() {
    // Convert board data to a serializable format
    return {
      gridSize: this.gameState.board.gridSize,
      squares: this.gameState.board.squares.map(square => ({
        x: square.x,
        y: square.y,
        id: square.id,
        controlledBy: square.controlledBy,
        specialLocation: square.specialLocation,
        borough: square.borough,
        incomeValue: square.incomeValue,
        heatLevel: square.heatLevel,
        hasBusiness: square.hasBusiness,
        businessId: square.businessId
        // Note: gang members are serialized in the gangs section
      }))
    };
  }
  
  serializeGangs() {
    return this.gameState.gangs.map(gang => ({
      id: gang.id,
      name: gang.name,
      description: gang.description,
      color: gang.color,
      specialAbilities: gang.specialAbilities,
      money: gang.money,
      heatLevel: gang.heatLevel,
      isPlayerControlled: gang.isPlayerControlled,
      boss: this.serializeGangMember(gang.boss),
      members: gang.members.map(this.serializeGangMember),
      controlledTerritories: gang.controlledTerritories.map(t => `${t.x}-${t.y}`),
      homeBaseCoords: gang.homeBase ? { x: gang.homeBase.x, y: gang.homeBase.y } : null,
      inventory: {
        weapons: gang.inventory.weapons,
        drugs: gang.inventory.drugs,
        businesses: gang.inventory.businesses.map(b => ({
          ...b,
          square: b.square ? `${b.square.x}-${b.square.y}` : null
        }))
      },
      alliances: gang.alliances
    }));
  }
  
  serializeGangMember(member) {
    if (!member) return null;
    
    return {
      id: member.id,
      type: member.type,
      gangId: member.gangId,
      maxLives: member.maxLives,
      lives: member.lives,
      effectiveness: member.effectiveness,
      equipment: member.equipment,
      squareCoords: member.square ? { x: member.square.x, y: member.square.y } : null,
      skills: member.skills,
      isWounded: member.isWounded
    };
  }
  
  serializeEvents() {
    return {
      activeEvents: this.gameState.events.activeEvents.map(event => ({
        id: event.id,
        name: event.name,
        description: event.description,
        duration: event.duration,
        turnsRemaining: event.turnsRemaining,
        affectedEntities: event.affectedEntities
      })),
      eventLog: this.gameState.eventLog
    };
  }
  
  deserializeGameState(saveData) {
    // Recreate the game state from saved data
    this.gameState.turnNumber = saveData.turnNumber;
    this.gameState.gamePhase = saveData.gamePhase;
    this.gameState.actionsRemaining = saveData.actionsRemaining;
    this.gameState.gameStatus = saveData.gameStatus;
    this.gameState.victoryType = saveData.victoryType;
    this.gameState.eventLog = saveData.events.eventLog;
    
    // Recreate board
    this.gameState.board = new GameBoard();
    this.gameState.board.gridSize = saveData.board.gridSize;
    
    // Create squares but don't populate gang members yet (need gangs first)
    saveData.board.squares.forEach((squareData, index) => {
      const square = this.gameState.board.squares[index];
      Object.assign(square, {
        controlledBy: squareData.controlledBy,
        specialLocation: squareData.specialLocation,
        borough: squareData.borough,
        incomeValue: squareData.incomeValue,
        heatLevel: squareData.heatLevel,
        hasBusiness: squareData.hasBusiness,
        businessId: squareData.businessId
      });
    });
    
    // Initialize systems
    this.gameState.police = new Police(this.gameState);
    this.gameState.economy = new EconomySystem(this.gameState);
    this.gameState.events = new EventSystem(this.gameState);
    this.gameState.combat = new CombatSystem(this.gameState);
    
    // Recreate gangs
    this.gameState.gangs = [];
    saveData.gangs.forEach(gangData => {
      const gang = new Gang(
        gangData.id,
        gangData.name,
        gangData.description,
        gangData.color,
        gangData.specialAbilities
      );
      
      gang.money = gangData.money;
      gang.heatLevel = gangData.heatLevel;
      gang.isPlayerControlled = gangData.isPlayerControlled;
      gang.alliances = gangData.alliances;
      
      // Set player gang reference
      if (gang.isPlayerControlled) {
        this.gameState.playerGang = gang;
      }
      
      // Set home base
      if (gangData.homeBaseCoords) {
        const homeBase = this.gameState.board.getSquare(
          gangData.homeBaseCoords.x,
          gangData.homeBaseCoords.y
        );
        gang.homeBase = homeBase;
      }
      
      // Create controlled territories list
      gang.controlledTerritories = gangData.controlledTerritories.map(coordStr => {
        const [x, y] = coordStr.split('-').map(Number);
        return this.gameState.board.getSquare(x, y);
      });
      
      // Recreate inventory
      gang.inventory.weapons = gangData.inventory.weapons;
      gang.inventory.drugs = gangData.inventory.drugs;
      gang.inventory.businesses = gangData.inventory.businesses.map(b => {
        const business = { ...b };
        if (b.square) {
          const [x, y] = b.square.split('-').map(Number);
          business.square = this.gameState.board.getSquare(x, y);
        }
        return business;
      });
      
      // Add gang to game state
      this.gameState.gangs.push(gang);
    });
    
    // Recreate gang members and place on board
    saveData.gangs.forEach((gangData, gangIndex) => {
      const gang = this.gameState.gangs[gangIndex];
      
      // Recreate boss
      if (gangData.boss) {
        gang.boss = this.deserializeGangMember(gangData.boss, gang.id);
        
        // Place on board
        if (gangData.boss.squareCoords) {
          const square = this.gameState.board.getSquare(
            gangData.boss.squareCoords.x,
            gangData.boss.squareCoords.y
          );
          
          square.gangMembers[gang.id] = square.gangMembers[gang.id] || [];
          square.gangMembers[gang.id].push(gang.boss);
          gang.boss.square = square;
        }
      }
      
      // Recreate regular members
      gangData.members.forEach(memberData => {
        const member = this.deserializeGangMember(memberData, gang.id);
        gang.members.push(member);
        
        // Place on board
        if (memberData.squareCoords) {
          const square = this.gameState.board.getSquare(
            memberData.squareCoords.x,
            memberData.squareCoords.y
          );
          
          square.gangMembers[gang.id] = square.gangMembers[gang.id] || [];
          square.gangMembers[gang.id].push(member);
          member.square = square;
        }
      });
    });
    
    // Recreate active events
    this.gameState.events.activeEvents = saveData.events.activeEvents.map(eventData => {
      return {
        ...eventData,
        effect: this.gameState.events.eventDeck.find(e => e.id === eventData.id)?.effect
      };
    });
    
    // Set up UI
    this.gameState.ui = new GameUI(this.gameState);
    this.gameState.ui.initialize();
    
    // Update UI based on current phase
    if (this.gameState.gamePhase === 'action' && this.gameState.playerGang) {
      this.gameState.ui.updateActionDisplay(this.gameState.actionsRemaining);
      this.gameState.ui.enableActionButtons(this.gameState.actionsRemaining > 0);
    }
  }
  
  deserializeGangMember(memberData, gangId) {
    if (!memberData) return null;
    
    const member = new GangMember(memberData.type, gangId, memberData.maxLives);
    
    member.id = memberData.id;
    member.lives = memberData.lives;
    member.effectiveness = memberData.effectiveness;
    member.equipment = memberData.equipment;
    member.skills = memberData.skills;
    member.isWounded = memberData.isWounded;
    
    return member;
  }
}
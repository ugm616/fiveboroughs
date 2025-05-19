class EventSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.eventDeck = this.createEventDeck();
    this.activeEvents = [];
  }
  
  createEventDeck() {
    return [
      {
        id: 'police_crackdown',
        name: 'Police Crackdown',
        description: 'Police raid territories with high heat levels.',
        duration: 2,
        effect: (gs) => this.policeCrackdownEffect(gs)
      },
      {
        id: 'turf_war',
        name: 'Turf War',
        description: 'Two neighborhoods become more valuable for 3 turns.',
        duration: 3,
        effect: (gs) => this.turfWarEffect(gs)
      },
      {
        id: 'market_flood',
        name: 'Market Flood',
        description: 'One drug crashes in price, another spikes.',
        duration: 2,
        effect: (gs) => this.marketFloodEffect(gs)
      },
      {
        id: 'gang_summit',
        name: 'Gang Summit',
        description: 'All gangs can form alliances this turn without action cost.',
        duration: 1,
        effect: (gs) => this.gangSummitEffect(gs)
      },
      {
        id: 'informant',
        name: 'Informant',
        description: 'Gang with highest heat loses one member to arrest.',
        duration: 1,
        effect: (gs) => this.informantEffect(gs)
      },
      {
        id: 'weapon_shipment',
        name: 'Weapon Shipment',
        description: 'Black markets have discounted weapons this turn.',
        duration: 1,
        effect: (gs) => this.weaponShipmentEffect(gs)
      },
      {
        id: 'territory_dispute',
        name: 'Territory Dispute',
        description: 'Random territory becomes contested, all gangs can attempt to claim it.',
        duration: 2,
        effect: (gs) => this.territoryDisputeEffect(gs)
      },
      {
        id: 'protection_racket',
        name: 'Protection Racket Opportunity',
        description: 'Businesses generate extra income but increase heat more.',
        duration: 2,
        effect: (gs) => this.protectionRacketEffect(gs)
      },
      {
        id: 'heat_wave',
        name: 'Heat Wave',
        description: 'Drug demand rises, prices increase across the board.',
        duration: 3,
        effect: (gs) => this.heatWaveEffect(gs)
      },
      {
        id: 'street_festival',
        name: 'Street Festival',
        description: 'No combat allowed in one borough, but extra income from territories.',
        duration: 2,
        effect: (gs) => this.streetFestivalEffect(gs)
      }
    ];
  }
  
  drawEvent() {
    if (this.eventDeck.length === 0) {
      this.eventDeck = this.createEventDeck(); // Refresh deck if empty
    }
    
    const randomIndex = Math.floor(Math.random() * this.eventDeck.length);
    const event = this.eventDeck.splice(randomIndex, 1)[0];
    
    // Clone the event to avoid reference issues
    const activeEvent = {
      ...event,
      turnsRemaining: event.duration,
      affectedEntities: [] // Will store any entities affected by this event
    };
    
    this.activeEvents.push(activeEvent);
    
    // Apply the initial effect
    activeEvent.effect(this.gameState);
    
    return activeEvent;
  }
  
  processTurn() {
    // Process existing events
    this.activeEvents.forEach(event => {
      // Decrease duration
      event.turnsRemaining--;
      
      // If event is still active, apply effects again
      if (event.turnsRemaining > 0) {
        event.effect(this.gameState);
      }
    });
    
    // Remove expired events
    this.activeEvents = this.activeEvents.filter(event => event.turnsRemaining > 0);
    
    // Draw a new event with some probability
    if (Math.random() < 0.7) { // 70% chance of event each turn
      return this.drawEvent();
    }
    
    return null;
  }
  
  // Event effect implementations
  policeCrackdownEffect(gameState) {
    const highHeatSquares = gameState.board.squares.filter(s => s.heatLevel >= 3);
    
    highHeatSquares.forEach(square => {
      // Increase police presence
      const nearestStation = gameState.police.stations.sort((a, b) => {
        const distA = Math.abs(a.x - square.x) + Math.abs(a.y - square.y);
        const distB = Math.abs(b.x - square.x) + Math.abs(b.y - square.y);
        return distA - distB;
      })[0];
      
      if (nearestStation) {
        const unit = gameState.police.deployUnit(nearestStation);
        unit.targetSquare = square; // Direct this unit to the high heat square
      }
    });
  }
  
  turfWarEffect(gameState) {
    // Pick two random territories that aren't special locations
    const eligibleSquares = gameState.board.squares.filter(s => !s.specialLocation);
    
    if (eligibleSquares.length >= 2) {
      for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * eligibleSquares.length);
        const square = eligibleSquares.splice(randomIndex, 1)[0];
        
        // Increase the value of the territory
        square.incomeValue *= 2;
        square.isTurfWarZone = true;
        
        // Store affected square to reset later
        const eventIndex = this.activeEvents.findIndex(e => e.id === 'turf_war');
        if (eventIndex >= 0) {
          this.activeEvents[eventIndex].affectedEntities.push(square);
        }
      }
    }
  }
  
  // Reset turf war when it expires
  resetTurfWar() {
    const turfWarEvent = this.activeEvents.find(e => e.id === 'turf_war');
    if (turfWarEvent) {
      turfWarEvent.affectedEntities.forEach(square => {
        square.incomeValue /= 2;
        square.isTurfWarZone = false;
      });
    }
  }
  
  marketFloodEffect(gameState) {
    const drugMarket = gameState.economy.drugMarket;
    const drugTypes = drugMarket.drugTypes.map(d => d.id);
    
    // Pick two different drugs
    const drug1 = drugTypes[Math.floor(Math.random() * drugTypes.length)];
    let drug2;
    do {
      drug2 = drugTypes[Math.floor(Math.random() * drugTypes.length)];
    } while (drug2 === drug1);
    
    // Crash one drug price
    drugMarket.prices[drug1] = Math.floor(drugMarket.prices[drug1] * 0.5);
    
    // Spike another drug price
    drugMarket.prices[drug2] = Math.floor(drugMarket.prices[drug2] * 1.8);
    
    // Store affected drugs to reset later
    const eventIndex = this.activeEvents.findIndex(e => e.id === 'market_flood');
    if (eventIndex >= 0) {
      this.activeEvents[eventIndex].affectedEntities.push({
        type: 'drugs',
        ids: [drug1, drug2],
        originalPrices: {
          [drug1]: drugMarket.prices[drug1] * 2,
          [drug2]: Math.floor(drugMarket.prices[drug2] / 1.8)
        }
      });
    }
  }
  
  // More event effect implementations would follow...
}
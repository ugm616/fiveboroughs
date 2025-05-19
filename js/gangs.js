class Gang {
  constructor(id, name, description, color, specialAbilities) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.color = color;
    this.specialAbilities = specialAbilities;
    this.money = 0;
    this.boss = null;
    this.members = [];
    this.controlledTerritories = [];
    this.inventory = {
      weapons: [],
      drugs: {},
      businesses: []
    };
    this.heatLevel = 0;
    this.alliances = [];
    this.isPlayerControlled = false;
  }
  
  initializeStartingResources() {
    // Set starting resources based on gang type
    switch(this.id) {
      case 'mafia':
        this.money = 500;
        this.addStartingWeapons(['pistol', 'shotgun']);
        break;
      case 'bikers':
        this.money = 300;
        this.addStartingWeapons(['bat', 'chain', 'pistol']);
        break;
      case 'yakuza':
        this.money = 450;
        this.addStartingWeapons(['katana', 'pistol']);
        break;
      case 'cartel':
        this.money = 600;
        this.inventory.drugs = {
          cocaine: 5,
          marijuana: 10
        };
        this.addStartingWeapons(['pistol']);
        break;
      case 'streetGang':
        this.money = 250;
        this.addStartingWeapons(['knife', 'pistol']);
        break;
    }
  }
  
  addStartingWeapons(weaponTypes) {
    weaponTypes.forEach(type => {
      this.inventory.weapons.push(WeaponFactory.createWeapon(type));
    });
  }
  
  placeBoss(square) {
    this.boss = new GangMember('boss', this.id, 5); // Boss has 5 lives
    this.boss.square = square;
    square.gangMembers[this.id] = square.gangMembers[this.id] || [];
    square.gangMembers[this.id].push(this.boss);
    this.homeBase = square;
    square.controlledBy = this.id;
    this.controlledTerritories.push(square);
  }
  
  recruitMember(isPaid = true) {
    const lives = isPaid ? 3 : 1;
    const member = new GangMember('member', this.id, lives);
    this.members.push(member);
    return member;
  }
  
  applySpecialAbility(abilityType, context) {
    // Apply gang-specific special abilities
    if (!this.specialAbilities.includes(abilityType)) return false;
    
    switch(abilityType) {
      case 'protectionRacket':
        return context.income * 1.2; // 20% more income from businesses
      case 'roadWarriors':
        return context.movementPoints + 1; // Extra movement
      case 'codeOfHonor':
        if (context.type === 'newMember') {
          context.member.maxLives += 1;
          context.member.lives += 1;
        }
        return context;
      // More abilities would be implemented
    }
  }
  
  // AI methods for computer-controlled gangs
  calculateNextMove(gameState) {
    if (this.isPlayerControlled) return; // Only for AI gangs
    
    // Simple priority-based AI (would be much more sophisticated in final version)
    const priorities = {
      expandTerritory: 0.3,
      attackRivals: 0.2,
      buildEconomy: 0.3,
      defendTerritory: 0.2
    };
    
    // Adjust priorities based on current game state
    if (this.money < 100) priorities.buildEconomy += 0.2;
    if (this.members.length < 5) priorities.expandTerritory -= 0.1;
    if (this.heatLevel > 3) priorities.defendTerritory += 0.2;
    
    // Choose a strategy based on weighted priorities
    const strategy = this.selectStrategyFromPriorities(priorities);
    
    // Execute the chosen strategy
    this.executeStrategy(strategy, gameState);
  }
  
  // More gang-related methods would be implemented...
}

// Define specific gang types
const gangTypes = [
  {
    id: 'mafia',
    name: 'The Five Points',
    description: 'Traditional Italian-American Mafia with strong business connections',
    color: '#990000', // Dark red
    specialAbilities: ['protectionRacket', 'familyConnections']
  },
  {
    id: 'bikers',
    name: "Hell's Angels",
    description: 'Motorcycle gang known for their mobility and intimidation tactics',
    color: '#000000', // Black
    specialAbilities: ['roadWarriors', 'intimidation']
  },
  {
    id: 'yakuza',
    name: 'Golden Dragon',
    description: 'Japanese crime syndicate with a strict code of honor',
    color: '#d4af37', // Dark gold
    specialAbilities: ['codeOfHonor', 'businessFronts']
  },
  {
    id: 'cartel',
    name: 'Los Lobos',
    description: 'Mexican drug cartel with extensive smuggling networks',
    color: '#006400', // Dark green
    specialAbilities: ['drugLords', 'borderConnections']
  },
  {
    id: 'streetGang',
    name: 'The Kings',
    description: 'Local street gang with deep neighborhood connections',
    color: '#4b0082', // Dark indigo
    specialAbilities: ['localKnowledge', 'recruitmentDrive']
  }
];

class GangMember {
  constructor(type, gangId, lives) {
    this.id = `${gangId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.type = type;
    this.gangId = gangId;
    this.maxLives = lives;
    this.lives = lives;
    this.effectiveness = Math.floor(Math.random() * 6) + 2; // Base 2-7
    this.equipment = [];
    this.square = null;
    this.skills = [];
    this.isWounded = false;
  }
  
  equipWeapon(weapon) {
    this.equipment.push(weapon);
    return this;
  }
  
  getCombatEffectiveness() {
    let total = this.effectiveness;
    this.equipment.forEach(item => {
      if (item.type === 'weapon') {
        total += item.combatBonus;
      }
    });
    
    // Apply wounds penalty
    if (this.isWounded) total -= 1;
    
    return Math.max(0, total); // Minimum 0 effectiveness
  }
  
  takeDamage() {
    this.lives -= 1;
    this.isWounded = true;
    return this.lives <= 0; // Return true if dead
  }
  
  heal() {
    if (this.lives < this.maxLives) {
      this.lives += 1;
      this.isWounded = false;
      return true;
    }
    return false;
  }
}
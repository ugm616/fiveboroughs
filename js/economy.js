class EconomySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.drugMarket = new DrugMarket();
    this.weaponMarket = new WeaponMarket();
    this.businessTypes = [
      { type: 'restaurant', cost: 200, income: 50, heat: 1, name: 'Restaurant' },
      { type: 'club', cost: 500, income: 120, heat: 2, name: 'Nightclub' },
      { type: 'store', cost: 300, income: 75, heat: 1, name: 'Store' },
      { type: 'casino', cost: 1000, income: 250, heat: 3, name: 'Illegal Casino' },
      { type: 'laundromat', cost: 400, income: 100, heat: 1, name: 'Laundromat' }
    ];
  }
  
  processTerritoryIncome(gang) {
    let totalIncome = 0;
    
    gang.controlledTerritories.forEach(square => {
      // Base territory income
      let income = square.incomeValue;
      
      // Borough-specific bonuses
      if (square.borough === 'manhattan') income *= 1.5;
      
      // Special ability bonuses
      if (gang.specialAbilities.includes('protectionRacket')) {
        income = gang.applySpecialAbility('protectionRacket', { income });
      }
      
      totalIncome += income;
    });
    
    gang.money += totalIncome;
    return totalIncome;
  }
  
  processBusinessIncome(gang) {
    let totalIncome = 0;
    let totalHeat = 0;
    
    gang.inventory.businesses.forEach(business => {
      let income = business.income;
      
      // Apply special abilities
      if (gang.specialAbilities.includes('businessFronts')) {
        income += 30; // Extra $30 per business
      }
      
      totalIncome += income;
      totalHeat += business.heat;
      
      // Update the business's square location with heat
      if (business.square) {
        business.square.heatLevel += business.heat;
      }
    });
    
    gang.money += totalIncome;
    gang.heatLevel += totalHeat;
    
    return { income: totalIncome, heat: totalHeat };
  }
  
  buyDrugs(gang, drugType, quantity) {
    const price = this.drugMarket.getCurrentPrice(drugType);
    const totalCost = price * quantity;
    
    // Check if gang can afford it
    if (gang.money < totalCost) return { success: false, reason: 'Not enough money' };
    
    // Apply cartel discount if applicable
    let actualCost = totalCost;
    if (gang.specialAbilities.includes('drugLords')) {
      actualCost = Math.floor(totalCost * 0.75); // 25% discount
    }
    
    gang.money -= actualCost;
    gang.inventory.drugs[drugType] = (gang.inventory.drugs[drugType] || 0) + quantity;
    
    // Add heat from drug transaction
    gang.heatLevel += Math.ceil(quantity / 5);
    
    return {
      success: true,
      cost: actualCost,
      heat: Math.ceil(quantity / 5)
    };
  }
  
  sellDrugs(gang, drugType, quantity) {
    // Check if gang has enough drugs
    if (!gang.inventory.drugs[drugType] || gang.inventory.drugs[drugType] < quantity) {
      return { success: false, reason: 'Not enough drugs' };
    }
    
    const price = this.drugMarket.getCurrentPrice(drugType);
    let totalProfit = price * quantity;
    
    // Apply cartel bonus if applicable
    if (gang.specialAbilities.includes('drugLords')) {
      totalProfit = Math.floor(totalProfit * 1.25); // 25% bonus
    }
    
    gang.money += totalProfit;
    gang.inventory.drugs[drugType] -= quantity;
    
    // Add heat from drug transaction
    gang.heatLevel += Math.ceil(quantity / 3);
    
    return {
      success: true,
      profit: totalProfit,
      heat: Math.ceil(quantity / 3)
    };
  }
  
  buyWeapon(gang, weaponType) {
    const weapon = this.weaponMarket.getWeapon(weaponType);
    if (!weapon) return { success: false, reason: 'Weapon not available' };
    
    let cost = weapon.cost;
    
    // Apply family connections discount if applicable
    if (gang.specialAbilities.includes('familyConnections')) {
      cost = Math.floor(cost * 0.8); // 20% discount
    }
    
    // Check if gang can afford it
    if (gang.money < cost) return { success: false, reason: 'Not enough money' };
    
    gang.money -= cost;
    gang.inventory.weapons.push(weapon);
    
    return {
      success: true,
      cost: cost,
      weapon: weapon
    };
  }
  
  establishBusiness(gang, businessType, square) {
    const businessTemplate = this.businessTypes.find(b => b.type === businessType);
    if (!businessTemplate) return { success: false, reason: 'Business type not found' };
    
    // Check if gang can afford it
    if (gang.money < businessTemplate.cost) {
      return { success: false, reason: 'Not enough money' };
    }
    
    // Check if square is controlled by this gang
    if (square.controlledBy !== gang.id) {
      return { success: false, reason: 'Cannot establish business in territory not controlled by your gang' };
    }
    
    // Create the business
    const business = {
      id: `business-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: businessTemplate.type,
      name: businessTemplate.name,
      income: businessTemplate.income,
      heat: businessTemplate.heat,
      square: square
    };
    
    gang.money -= businessTemplate.cost;
    gang.inventory.businesses.push(business);
    
    // Mark the square as having a business
    square.hasBusiness = true;
    square.businessId = business.id;
    
    return {
      success: true,
      cost: businessTemplate.cost,
      business: business
    };
  }
}

class DrugMarket {
  constructor() {
    this.drugTypes = [
      { id: 'marijuana', baseLow: 20, baseHigh: 60, name: 'Marijuana' },
      { id: 'cocaine', baseLow: 80, baseHigh: 200, name: 'Cocaine' },
      { id: 'heroin', baseLow: 120, baseHigh: 300, name: 'Heroin' },
      { id: 'meth', baseLow: 100, baseHigh: 250, name: 'Methamphetamine' },
      { id: 'pills', baseLow: 40, baseHigh: 120, name: 'Pills' }
    ];
    
    this.prices = {};
    this.fluctuationHistory = {};
    
    // Initialize prices
    this.drugTypes.forEach(drug => {
      this.prices[drug.id] = this.generateRandomPrice(drug);
      this.fluctuationHistory[drug.id] = [];
    });
  }
  
  generateRandomPrice(drug) {
    return Math.floor(Math.random() * (drug.baseHigh - drug.baseLow + 1)) + drug.baseLow;
  }
  
  getCurrentPrice(drugType) {
    return this.prices[drugType];
  }
  
  updatePrices() {
    this.drugTypes.forEach(drug => {
      // Record previous price for history
      const previousPrice = this.prices[drug.id];
      
      // Normal fluctuation - prices can go up or down by up to 20%
      let fluctuation = Math.random() * 0.4 - 0.2; // -20% to +20%
      
      // Small chance of major market event
      if (Math.random() < 0.1) {
        // Major event - prices can go up or down by up to 50%
        fluctuation = Math.random() > 0.5 ? 
                     Math.random() * 0.5 : // Up to +50%
                     -Math.random() * 0.5; // Up to -50%
      }
      
      // Apply fluctuation
      let newPrice = Math.floor(previousPrice * (1 + fluctuation));
      
      // Ensure price stays within bounds
      newPrice = Math.max(drug.baseLow / 2, Math.min(newPrice, drug.baseHigh * 1.5));
      
      // Update price
      this.prices[drug.id] = newPrice;
      
      // Record fluctuation in history
      this.fluctuationHistory[drug.id].push({
        previous: previousPrice,
        new: newPrice,
        change: ((newPrice - previousPrice) / previousPrice) * 100
      });
      
      // Keep history to a reasonable size
      if (this.fluctuationHistory[drug.id].length > 10) {
        this.fluctuationHistory[drug.id].shift();
      }
    });
  }
  
  getMarketTrend(drugType) {
    const history = this.fluctuationHistory[drugType];
    if (history.length < 2) return 'stable';
    
    const recentChanges = history.slice(-3);
    const avgChange = recentChanges.reduce((sum, item) => sum + item.change, 0) / recentChanges.length;
    
    if (avgChange > 10) return 'rising-fast';
    if (avgChange > 3) return 'rising';
    if (avgChange < -10) return 'falling-fast';
    if (avgChange < -3) return 'falling';
    return 'stable';
  }
}

class WeaponMarket {
  constructor() {
    this.weapons = [
      { id: 'knife', name: 'Knife', combatBonus: 1, cost: 50 },
      { id: 'bat', name: 'Baseball Bat', combatBonus: 1, cost: 75 },
      { id: 'chain', name: 'Chain', combatBonus: 1, cost: 60 },
      { id: 'pistol', name: 'Pistol', combatBonus: 2, cost: 200 },
      { id: 'shotgun', name: 'Shotgun', combatBonus: 3, cost: 350 },
      { id: 'katana', name: 'Katana', combatBonus: 3, cost: 400 },
      { id: 'smg', name: 'SMG', combatBonus: 3, cost: 500 },
      { id: 'rifle', name: 'Assault Rifle', combatBonus: 4, cost: 750 },
      // Special weapons only available at black markets
      { id: 'grenade', name: 'Grenade', combatBonus: 5, cost: 1000, blackMarketOnly: true },
      { id: 'bodyArmor', name: 'Body Armor', combatBonus: 2, defensiveBonus: 3, cost: 600, blackMarketOnly: true }
    ];
  }
  
  getWeapon(weaponId) {
    const weapon = this.weapons.find(w => w.id === weaponId);
    if (!weapon) return null;
    
    // Create a copy of the weapon to avoid reference issues
    return {
      ...weapon,
      id: `${weapon.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'weapon'
    };
  }
  
  getAvailableWeapons(isBlackMarket = false) {
    return this.weapons.filter(w => !w.blackMarketOnly || isBlackMarket);
  }
}
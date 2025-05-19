class GameUI {
  constructor(gameState) {
    this.gameState = gameState;
    this.selectedSquare = null;
    this.selectedGangMember = null;
    this.tooltips = {};
    this.modalActive = false;
  }
  
  initialize() {
    // Setup initial UI elements
    this.setupGameBoard();
    this.setupControlPanel();
    this.setupGangPanel();
    this.setupMessagePanel();
    this.setupMarketPanel();
    this.setupEventListeners();
    
    // Initial update
    this.updateBoardDisplay();
    if (this.gameState.playerGang) {
      this.updateGangDisplay(this.gameState.playerGang);
      this.updateMoneyDisplay(this.gameState.playerGang.money);
      this.updateHeatDisplay(this.gameState.playerGang.heatLevel);
    }
  }
  
  setupGameBoard() {
    const boardContainer = document.getElementById('game-board-container');
    if (!boardContainer) {
      console.error('Game board container not found');
      return;
    }
    
    // Create board element
    const boardElement = document.createElement('div');
    boardElement.id = 'game-board';
    boardElement.className = 'game-board';
    boardContainer.appendChild(boardElement);
    
    // Add borough labels
    const boroughs = Object.keys(this.gameState.board.boroughs);
    boroughs.forEach(borough => {
      const label = document.createElement('div');
      label.className = 'borough-label';
      label.textContent = borough.charAt(0).toUpperCase() + borough.slice(1);
      
      // Position label based on borough location
      const boroughSquares = this.gameState.board.boroughs[borough].squares;
      if (boroughSquares.length > 0) {
        const centerSquare = boroughSquares[Math.floor(boroughSquares.length / 2)];
        label.style.left = `${(centerSquare.x / this.gameState.board.gridSize) * 100}%`;
        label.style.top = `${(centerSquare.y / this.gameState.board.gridSize) * 100}%`;
      }
      
      boardContainer.appendChild(label);
    });
    
    // Render the initial board
    this.gameState.board.render();
  }
  
  setupControlPanel() {
    const controlPanel = document.getElementById('control-panel');
    if (!controlPanel) {
      console.error('Control panel not found');
      return;
    }
    
    // Create action buttons
    const actionTypes = [
      { id: 'move', label: 'Move', icon: '→' },
      { id: 'recruit', label: 'Recruit', icon: '👥' },
      { id: 'deal', label: 'Deal', icon: '💊' },
      { id: 'arm', label: 'Weapons', icon: '🔫' },
      { id: 'establish', label: 'Business', icon: '🏢' },
      { id: 'heal', label: 'Heal', icon: '🩹' },
      { id: 'attack', label: 'Attack', icon: '⚔️' }
    ];
    
    actionTypes.forEach(action => {
      const button = document.createElement('button');
      button.id = `action-${action.id}`;
      button.className = 'action-button';
      button.innerHTML = `<span class="icon">${action.icon}</span> ${action.label}`;
      button.disabled = true;
      
      button.addEventListener('click', () => this.handleActionButtonClick(action.id));
      
      controlPanel.appendChild(button);
    });
    
    // Create turn info display
    const turnInfo = document.createElement('div');
    turnInfo.id = 'turn-info';
    turnInfo.innerHTML = `
      <div class="info-item">
        <span class="label">Turn:</span>
        <span id="turn-number" class="value">${this.gameState.turnNumber}</span>
      </div>
      <div class="info-item">
        <span class="label">Actions:</span>
        <span id="actions-remaining" class="value">${this.gameState.actionsRemaining}</span>
      </div>
      <div class="info-item">
        <span class="label">Money:</span>
        <span id="money-display" class="value">$0</span>
      </div>
      <div class="info-item">
        <span class="label">Heat:</span>
        <span id="heat-display" class="value">0</span>
      </div>
    `;
    controlPanel.appendChild(turnInfo);
    
    // Create save/load buttons
    const gameControls = document.createElement('div');
    gameControls.id = 'game-controls';
    gameControls.innerHTML = `
      <button id="save-game" class="control-button">Save Game</button>
      <button id="new-game" class="control-button">New Game</button>
    `;
    controlPanel.appendChild(gameControls);
    
    // Add event listeners
    document.getElementById('save-game').addEventListener('click', () => this.saveGame());
    document.getElementById('new-game').addEventListener('click', () => this.confirmNewGame());
  }
  
  setupGangPanel() {
    const gangPanel = document.getElementById('gang-panel');
    if (!gangPanel) {
      console.error('Gang panel not found');
      return;
    }
    
    // Create gang info display
    if (this.gameState.playerGang) {
      const gangInfo = document.createElement('div');
      gangInfo.id = 'gang-info';
      gangInfo.innerHTML = `
        <div class="gang-name" style="color: ${this.gameState.playerGang.color}">
          ${this.gameState.playerGang.name}
        </div>
        <div class="gang-description">${this.gameState.playerGang.description}</div>
      `;
      gangPanel.appendChild(gangInfo);
      
      // Create gang roster
      const gangRoster = document.createElement('div');
      gangRoster.id = 'gang-roster';
      gangRoster.innerHTML = '<h3>Gang Members</h3>';
      
      // Boss section
      const bossSection = document.createElement('div');
      bossSection.id = 'boss-section';
      bossSection.innerHTML = '<h4>Boss</h4>';
      gangRoster.appendChild(bossSection);
      
      // Members section
      const membersSection = document.createElement('div');
      membersSection.id = 'members-section';
      membersSection.innerHTML = '<h4>Members</h4>';
      gangRoster.appendChild(membersSection);
      
      gangPanel.appendChild(gangRoster);
      
      // Create inventory section
      const inventory = document.createElement('div');
      inventory.id = 'inventory';
      inventory.innerHTML = `
        <h3>Inventory</h3>
        <div id="weapons-list" class="inventory-section">
          <h4>Weapons</h4>
          <div class="items"></div>
        </div>
        <div id="drugs-list" class="inventory-section">
          <h4>Drugs</h4>
          <div class="items"></div>
        </div>
        <div id="businesses-list" class="inventory-section">
          <h4>Businesses</h4>
          <div class="items"></div>
        </div>
      `;
      gangPanel.appendChild(inventory);
    }
  }
  
  setupMessagePanel() {
    const messagePanel = document.getElementById('message-panel');
    if (!messagePanel) {
      console.error('Message panel not found');
      return;
    }
    
    // Create message log
    const messageLog = document.createElement('div');
    messageLog.id = 'message-log';
    messagePanel.appendChild(messageLog);
    
    // Create phase indicator
    const phaseIndicator = document.createElement('div');
    phaseIndicator.id = 'phase-indicator';
    phaseIndicator.innerHTML = `
      <div class="phase-title">Setup Phase</div>
      <div class="phase-description">Game is starting...</div>
    `;
    messagePanel.appendChild(phaseIndicator);
  }
  
  setupMarketPanel() {
    const marketPanel = document.getElementById('market-panel');
    if (!marketPanel) {
      console.error('Market panel not found');
      return;
    }
    
    // Create drug market display
    const drugMarket = document.createElement('div');
    drugMarket.id = 'drug-market';
    drugMarket.innerHTML = '<h3>Drug Market</h3>';
    
    // Create table for drug prices
    const table = document.createElement('table');
    table.className = 'market-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Drug</th>
          <th>Price</th>
          <th>Trend</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="drug-prices"></tbody>
    `;
    drugMarket.appendChild(table);
    marketPanel.appendChild(drugMarket);
    
    // Update the market display
    this.updateMarketDisplay();
  }
  
  setupEventListeners() {
    // Save button
    document.getElementById('save-game')?.addEventListener('click', () => this.saveGame());
    
    // New game button
    document.getElementById('new-game')?.addEventListener('click', () => this.confirmNewGame());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape closes any open modal
      if (e.key === 'Escape' && this.modalActive) {
        this.closeAllModals();
      }
      
      // Number keys 1-7 for actions
      if (this.gameState.gamePhase === 'action' && this.gameState.actionsRemaining > 0) {
        const actionMapping = {
          '1': 'move',
          '2': 'recruit',
          '3': 'deal',
          '4': 'arm',
          '5': 'establish',
          '6': 'heal',
          '7': 'attack'
        };
        
        if (actionMapping[e.key]) {
          this.handleActionButtonClick(actionMapping[e.key]);
        }
      }
    });
  }
  
  // Update display methods
  updateBoardDisplay() {
    this.gameState.board.render();
    
    // Update turn counter
    const turnNumber = document.getElementById('turn-number');
    if (turnNumber) {
      turnNumber.textContent = this.gameState.turnNumber;
    }
  }
  
  updateGangDisplay(gang) {
    // Update boss display
    const bossSection = document.getElementById('boss-section');
    if (bossSection) {
      bossSection.innerHTML = '<h4>Boss</h4>';
      
      if (gang.boss) {
        const bossElement = this.createGangMemberElement(gang.boss);
        bossSection.appendChild(bossElement);
      } else {
        bossSection.innerHTML += '<div class="no-boss">Boss eliminated!</div>';
      }
    }
    
    // Update members display
    const membersSection = document.getElementById('members-section');
    if (membersSection) {
      membersSection.innerHTML = '<h4>Members</h4>';
      
      if (gang.members.length === 0) {
        membersSection.innerHTML += '<div class="no-members">No gang members</div>';
      } else {
        gang.members.forEach(member => {
          const memberElement = this.createGangMemberElement(member);
          membersSection.appendChild(memberElement);
        });
      }
    }
    
    // Update inventory
    this.updateInventoryDisplay(gang);
  }

  createGangMemberElement(member) {
    const element = document.createElement('div');
    element.className = 'gang-member';
    element.dataset.memberId = member.id;
    
    // Apply selected class if this member is selected
    if (this.selectedGangMember && this.selectedGangMember.id === member.id) {
      element.classList.add('selected');
    }
    
    // Show lives as hearts
    const hearts = '❤️'.repeat(member.lives) + '🖤'.repeat(member.maxLives - member.lives);
    
    element.innerHTML = `
      <div class="member-info">
        <span class="member-type">${member.type === 'boss' ? 'Boss' : 'Member'}</span>
        <span class="member-effectiveness">Power: ${member.getCombatEffectiveness()}</span>
      </div>
      <div class="member-lives">${hearts}</div>
      <div class="member-location">Location: ${member.square ? `(${member.square.x}, ${member.square.y})` : 'None'}</div>
      <div class="member-equipment">
        ${member.equipment.length > 0 ? 
          `Equipped: ${member.equipment.map(e => e.name).join(', ')}` : 
          'No equipment'}
      </div>
    `;
    
    // Add click handler to select this member
    element.addEventListener('click', () => this.selectGangMember(member));
    
    return element;
  }
  
  updateInventoryDisplay(gang) {
    // Update weapons
    const weaponsList = document.querySelector('#weapons-list .items');
    if (weaponsList) {
      weaponsList.innerHTML = '';
      
      if (gang.inventory.weapons.length === 0) {
        weaponsList.innerHTML = '<div class="no-items">No weapons</div>';
      } else {
        gang.inventory.weapons.forEach(weapon => {
          const weaponElement = document.createElement('div');
          weaponElement.className = 'inventory-item weapon';
          weaponElement.innerHTML = `
            <span class="item-name">${weapon.name}</span>
            <span class="item-bonus">+${weapon.combatBonus} combat</span>
          `;
          
          // Add context menu for equipping
          weaponElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showWeaponContextMenu(weapon, e);
          });
          
          weaponsList.appendChild(weaponElement);
        });
      }
    }
    
    // Update drugs
    const drugsList = document.querySelector('#drugs-list .items');
    if (drugsList) {
      drugsList.innerHTML = '';
      
      const drugsOwned = Object.entries(gang.inventory.drugs);
      if (drugsOwned.length === 0) {
        drugsList.innerHTML = '<div class="no-items">No drugs</div>';
      } else {
        drugsOwned.forEach(([drugType, quantity]) => {
          if (quantity <= 0) return;
          
          const drugElement = document.createElement('div');
          drugElement.className = 'inventory-item drug';
          
          // Get current price
          const currentPrice = this.gameState.economy.drugMarket.getCurrentPrice(drugType);
          const drugName = this.gameState.economy.drugMarket.drugTypes.find(d => d.id === drugType)?.name || drugType;
          
          drugElement.innerHTML = `
            <span class="item-name">${drugName}</span>
            <span class="item-quantity">x${quantity}</span>
            <span class="item-value">$${currentPrice}/unit</span>
          `;
          
          // Add context menu for selling
          drugElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showDrugContextMenu(drugType, quantity, e);
          });
          
          drugsList.appendChild(drugElement);
        });
      }
    }
    
    // Update businesses
    const businessesList = document.querySelector('#businesses-list .items');
    if (businessesList) {
      businessesList.innerHTML = '';
      
      if (gang.inventory.businesses.length === 0) {
        businessesList.innerHTML = '<div class="no-items">No businesses</div>';
      } else {
        gang.inventory.businesses.forEach(business => {
          const businessElement = document.createElement('div');
          businessElement.className = 'inventory-item business';
          businessElement.innerHTML = `
            <span class="item-name">${business.name}</span>
            <span class="item-income">+$${business.income}/turn</span>
            <span class="item-heat">+${business.heat} heat</span>
            <span class="item-location">
              ${business.square ? `At (${business.square.x}, ${business.square.y})` : 'Location unknown'}
            </span>
          `;
          businessesList.appendChild(businessElement);
        });
      }
    }
  }
  
  updateMarketDisplay() {
    const drugPricesTable = document.getElementById('drug-prices');
    if (!drugPricesTable) return;
    
    drugPricesTable.innerHTML = '';
    
    this.gameState.economy.drugMarket.drugTypes.forEach(drug => {
      const price = this.gameState.economy.drugMarket.getCurrentPrice(drug.id);
      const trend = this.gameState.economy.drugMarket.getMarketTrend(drug.id);
      
      const row = document.createElement('tr');
      
      // Trend indicator
      let trendIcon = '→';
      let trendClass = 'trend-stable';
      
      switch(trend) {
        case 'rising':
          trendIcon = '↗';
          trendClass = 'trend-rising';
          break;
        case 'rising-fast':
          trendIcon = '↑';
          trendClass = 'trend-rising-fast';
          break;
        case 'falling':
          trendIcon = '↘';
          trendClass = 'trend-falling';
          break;
        case 'falling-fast':
          trendIcon = '↓';
          trendClass = 'trend-falling-fast';
          break;
      }
      
      row.innerHTML = `
        <td>${drug.name}</td>
        <td>$${price}</td>
        <td class="${trendClass}">${trendIcon}</td>
        <td>
          <button class="buy-btn" data-drug="${drug.id}">Buy</button>
          <button class="sell-btn" data-drug="${drug.id}">Sell</button>
        </td>
      `;
      
      drugPricesTable.appendChild(row);
    });
    
    // Add event listeners for buy/sell buttons
    drugPricesTable.querySelectorAll('.buy-btn').forEach(button => {
      button.addEventListener('click', () => {
        const drugType = button.dataset.drug;
        this.showDrugBuyDialog(drugType);
      });
    });
    
    drugPricesTable.querySelectorAll('.sell-btn').forEach(button => {
      button.addEventListener('click', () => {
        const drugType = button.dataset.drug;
        this.showDrugSellDialog(drugType);
      });
    });
  }
  
  updateMoneyDisplay(amount) {
    const moneyDisplay = document.getElementById('money-display');
    if (moneyDisplay) {
      moneyDisplay.textContent = `$${amount}`;
      
      // Visual indicator for changes
      moneyDisplay.classList.add('flash');
      setTimeout(() => {
        moneyDisplay.classList.remove('flash');
      }, 1000);
    }
  }
  
  updateHeatDisplay(level) {
    const heatDisplay = document.getElementById('heat-display');
    if (heatDisplay) {
      heatDisplay.textContent = level;
      
      // Visual classes based on heat level
      heatDisplay.className = 'value';
      
      if (level >= 5) {
        heatDisplay.classList.add('heat-critical');
      } else if (level >= 3) {
        heatDisplay.classList.add('heat-high');
      } else if (level >= 1) {
        heatDisplay.classList.add('heat-medium');
      } else {
        heatDisplay.classList.add('heat-low');
      }
    }
  }
  
  updateActionDisplay(remaining) {
    const actionsDisplay = document.getElementById('actions-remaining');
    if (actionsDisplay) {
      actionsDisplay.textContent = remaining;
      
      // Visual indicator
      actionsDisplay.classList.add('flash');
      setTimeout(() => {
        actionsDisplay.classList.remove('flash');
      }, 500);
    }
  }
  
  // UI interaction methods
  handleActionButtonClick(actionType) {
    if (this.gameState.gamePhase !== 'action' || this.gameState.actionsRemaining <= 0) {
      this.showMessage('Cannot perform actions now', 'error');
      return;
    }
    
    switch(actionType) {
      case 'move':
        this.startMoveAction();
        break;
      case 'recruit':
        this.showRecruitDialog();
        break;
      case 'deal':
        this.showDealDialog();
        break;
      case 'arm':
        this.showArmDialog();
        break;
      case 'establish':
        this.startEstablishAction();
        break;
      case 'heal':
        this.startHealAction();
        break;
      case 'attack':
        this.startAttackAction();
        break;
    }
  }
  
  selectSquare(square) {
    // Deselect previous square
    if (this.selectedSquare) {
      document.getElementById(`square-${this.selectedSquare.id}`).classList.remove('selected');
    }
    
    // Select new square
    this.selectedSquare = square;
    document.getElementById(`square-${square.id}`).classList.add('selected');
    
    // Update info display with square details
    this.showSquareInfo(square);
  }
  
  selectGangMember(member) {
    // Deselect previous member
    if (this.selectedGangMember) {
      const prevElement = document.querySelector(`.gang-member[data-member-id="${this.selectedGangMember.id}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }
    
    // Select new member
    this.selectedGangMember = member;
    const element = document.querySelector(`.gang-member[data-member-id="${member.id}"]`);
    if (element) {
      element.classList.add('selected');
    }
    
    // If the member is on the board, also select that square
    if (member.square) {
      this.selectSquare(member.square);
    }
    
    this.showMessage(`Selected ${member.type === 'boss' ? 'Boss' : 'Gang Member'}`, 'info');
  }
  
  showSquareInfo(square) {
    // Create info panel to show square details
    let infoHTML = `
      <h4>Location (${square.x}, ${square.y})</h4>
      <p>Borough: ${square.borough || 'None'}</p>
      <p>Income: $${square.incomeValue} per turn</p>
      <p>Heat Level: ${square.heatLevel}</p>
    `;
    
    // Show special location
    if (square.specialLocation) {
      infoHTML += `<p class="special-location">Special: ${square.specialLocation}</p>`;
    }
    
    // Show controlling gang
    if (square.controlledBy) {
      const controllingGang = this.gameState.gangs.find(g => g.id === square.controlledBy);
      if (controllingGang) {
        infoHTML += `
          <p class="controlling-gang" style="color: ${controllingGang.color}">
            Controlled by: ${controllingGang.name}
          </p>
        `;
      }
    }
    
    // Show gang members present
    infoHTML += '<div class="present-gangs">';
    let hasGangMembers = false;
    
    for (const gangId in square.gangMembers) {
      const members = square.gangMembers[gangId];
      if (!members || members.length === 0) continue;
      
      hasGangMembers = true;
      const gang = this.gameState.gangs.find(g => g.id === gangId);
      
      infoHTML += `
        <div class="gang-presence" style="border-color: ${gang?.color || '#888'}">
          <span class="gang-name" style="color: ${gang?.color || '#888'}">
            ${gang?.name || 'Unknown Gang'}
          </span>
          <span class="member-count">${members.length} members</span>
          <ul class="members-list">
      `;
      
      members.forEach(member => {
        infoHTML += `
          <li class="member-item ${member.type === 'boss' ? 'boss' : ''}">
            ${member.type === 'boss' ? 'Boss' : 'Member'} (${member.lives}/${member.maxLives} lives)
          </li>
        `;
      });
      
      infoHTML += '</ul></div>';
    }
    
    if (!hasGangMembers) {
      infoHTML += '<p>No gang members present</p>';
    }
    
    infoHTML += '</div>';
    
    // Show police presence
    if (square.policeUnits && square.policeUnits.length > 0) {
      infoHTML += `
        <div class="police-presence">
          <span class="police-title">Police Presence</span>
          <span class="police-count">${square.policeUnits.length} units</span>
        </div>
      `;
    }
    
    // Update info display
    const infoPanel = document.getElementById('square-info');
    if (infoPanel) {
      infoPanel.innerHTML = infoHTML;
    } else {
      const panel = document.createElement('div');
      panel.id = 'square-info';
      panel.className = 'info-panel';
      panel.innerHTML = infoHTML;
      
      // Add to message panel
      const messagePanel = document.getElementById('message-panel');
      if (messagePanel) {
        // Remove old info panel if exists
        const oldPanel = document.getElementById('square-info');
        if (oldPanel) {
          messagePanel.removeChild(oldPanel);
        }
        messagePanel.appendChild(panel);
      }
    }
  }
  
  // Message and notification methods
  showMessage(text, type = 'info') {
    const messageLog = document.getElementById('message-log');
    if (!messageLog) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = text;
    
    messageLog.appendChild(messageElement);
    messageLog.scrollTop = messageLog.scrollHeight;
    
    // Fade out old messages
    if (messageLog.children.length > 30) {
      messageLog.removeChild(messageLog.children[0]);
    }
  }
  
  showPhaseMessage(title, description) {
    const phaseTitle = document.querySelector('#phase-indicator .phase-title');
    const phaseDescription = document.querySelector('#phase-indicator .phase-description');
    
    if (phaseTitle) {
      phaseTitle.textContent = title;
      phaseTitle.classList.add('flash');
      setTimeout(() => phaseTitle.classList.remove('flash'), 1500);
    }
    
    if (phaseDescription) {
      phaseDescription.textContent = description;
    }
    
    this.showMessage(`New Phase: ${title} - ${description}`, 'phase');
  }

  showEventMessage(title, description) {
    // Create event notification
    const notification = document.createElement('div');
    notification.className = 'event-notification';
    notification.innerHTML = `
      <h3>${title}</h3>
      <p>${description}</p>
      <button class="close-btn">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('active'), 100);
    
    // Add close handler
    notification.querySelector('.close-btn').addEventListener('click', () => {
      notification.classList.remove('active');
      setTimeout(() => document.body.removeChild(notification), 500);
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.remove('active');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 500);
      }
    }, 10000);
    
    // Also show in message log
    this.showMessage(`Event: ${title} - ${description}`, 'event');
  }
  
  // Dialog methods
  showDialog(title, content, buttons = []) {
    this.modalActive = true;
    
    // Create modal container if it doesn't exist
    let modal = document.getElementById('modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-container';
      document.body.appendChild(modal);
    }
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    
    // Add title
    const titleElement = document.createElement('div');
    titleElement.className = 'dialog-title';
    titleElement.textContent = title;
    dialog.appendChild(titleElement);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'dialog-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.closeDialog(dialog));
    titleElement.appendChild(closeButton);
    
    // Add content
    const contentElement = document.createElement('div');
    contentElement.className = 'dialog-content';
    
    if (typeof content === 'string') {
      contentElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentElement.appendChild(content);
    }
    
    dialog.appendChild(contentElement);
    
    // Add buttons
    if (buttons.length > 0) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'dialog-buttons';
      
      buttons.forEach(button => {
        const buttonElement = document.createElement('button');
        buttonElement.textContent = button.label;
        buttonElement.className = `dialog-button ${button.type || 'default'}`;
        buttonElement.addEventListener('click', () => {
          if (button.action) {
            button.action();
          }
          this.closeDialog(dialog);
        });
        
        buttonContainer.appendChild(buttonElement);
      });
      
      dialog.appendChild(buttonContainer);
    }
    
    // Add to modal container
    modal.innerHTML = '';
    modal.appendChild(dialog);
    
    // Show modal
    modal.style.display = 'flex';
    
    // Animate
    setTimeout(() => {
      dialog.classList.add('active');
    }, 50);
    
    return dialog;
  }
  
  closeDialog(dialog) {
    dialog.classList.remove('active');
    
    setTimeout(() => {
      const modal = document.getElementById('modal-container');
      if (modal) {
        modal.style.display = 'none';
        this.modalActive = false;
      }
    }, 300);
  }
  
  closeAllModals() {
    const modal = document.getElementById('modal-container');
    if (modal) {
      modal.style.display = 'none';
      this.modalActive = false;
    }
    
    // Also close any context menus
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
      document.body.removeChild(contextMenu);
    }
  }
  
  showGameOverScreen(status, victoryType, victorId) {
    let title, message, className;
    
    if (status === 'victory') {
      title = 'Victory!';
      className = 'victory';
      
      switch(victoryType) {
        case 'bossElimination':
          message = 'You eliminated all rival gang bosses!';
          break;
        case 'territoryDominance':
          message = 'You control the majority of the city!';
          break;
        case 'economic':
          message = 'Your economic empire dominates the city!';
          break;
        default:
          message = 'You have emerged victorious!';
      }
    } else {
      title = 'Defeat';
      className = 'defeat';
      
      // Get victor name
      let victorName = 'The Police';
      if (victorId) {
        const victorGang = this.gameState.gangs.find(g => g.id === victorId);
        if (victorGang) {
          victorName = victorGang.name;
        }
      }
      
      switch(victoryType) {
        case 'bossElimination':
          message = `Your boss was eliminated! ${victorName} now controls the city.`;
          break;
        case 'territoryDominance':
          message = `${victorName} has taken control of most of the city!`;
          break;
        case 'economic':
          message = `${victorName} has established economic dominance over the city!`;
          break;
        case 'police':
          message = 'The police have arrested all gang bosses and restored order to the city.';
          break;
        default:
          message = `You have been defeated by ${victorName}!`;
      }
    }
    
    // Create stats content
    const content = document.createElement('div');
    content.innerHTML = `
      <p class="game-over-message">${message}</p>
      <div class="game-stats">
        <h3>Game Statistics</h3>
        <ul>
          <li>Turns Played: ${this.gameState.turnNumber}</li>
          <li>Territory Controlled: ${this.gameState.playerGang.controlledTerritories.length} squares</li>
          <li>Final Money: $${this.gameState.playerGang.money}</li>
          <li>Gang Members: ${this.gameState.playerGang.members.length}</li>
          <li>Businesses Established: ${this.gameState.playerGang.inventory.businesses.length}</li>
        </ul>
      </div>
    `;
    
    // Show game over dialog
    const dialog = this.showDialog(title, content, [
      {
        label: 'New Game',
        type: 'primary',
        action: () => this.startNewGame()
      }
    ]);
    
    dialog.classList.add(className);
  }
  
  // Action methods
  startMoveAction() {
    if (!this.selectedGangMember) {
      this.showMessage('Select a gang member to move first', 'error');
      return;
    }
    
    if (this.selectedGangMember.type === 'boss' && 
        this.selectedGangMember.square === this.gameState.playerGang.homeBase) {
      this.showMessage('Boss cannot leave home base', 'error');
      return;
    }
    
    // Highlight adjacent squares
    const currentSquare = this.selectedGangMember.square;
    if (!currentSquare) {
      this.showMessage('Member not on board', 'error');
      return;
    }
    
    // Determine movement range
    let moveDistance = 1;
    if (this.gameState.playerGang.specialAbilities.includes('roadWarriors')) {
      moveDistance = 2;
    }
    
    // Get valid move squares
    const validSquares = [];
    
    for (let y = Math.max(0, currentSquare.y - moveDistance); 
         y <= Math.min(this.gameState.board.gridSize - 1, currentSquare.y + moveDistance); y++) {
      for (let x = Math.max(0, currentSquare.x - moveDistance); 
           x <= Math.min(this.gameState.board.gridSize - 1, currentSquare.x + moveDistance); x++) {
        
        const distance = Math.abs(currentSquare.x - x) + Math.abs(currentSquare.y - y);
        if (distance <= moveDistance && distance > 0) {
          const square = this.gameState.board.getSquare(x, y);
          validSquares.push(square);
        }
      }
    }
    
    // Highlight valid move squares
    validSquares.forEach(square => {
      const squareElement = document.getElementById(`square-${square.id}`);
      if (squareElement) {
        squareElement.classList.add('valid-move');
        
        // Add click handler
        const clickHandler = () => {
          // Execute move action
          const result = this.gameState.moveGangMember(
            this.gameState.playerGang, 
            this.selectedGangMember.id, 
            square
          );
          
          if (result.success) {
            this.showMessage(`Moved ${this.selectedGangMember.type === 'boss' ? 'Boss' : 'Member'} to (${square.x}, ${square.y})`, 'success');
            
            // Update displays
            this.updateBoardDisplay();
            this.updateGangDisplay(this.gameState.playerGang);
            
            // Remove highlights and handlers
            this.clearMoveHighlights();
          } else {
            this.showMessage(`Failed to move: ${result.reason}`, 'error');
          }
          
          squareElement.removeEventListener('click', clickHandler);
        };
        
        squareElement.addEventListener('click', clickHandler);
      }
    });
    
    this.showMessage('Select a highlighted square to move to', 'info');
    
    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-move';
    cancelButton.className = 'cancel-action-button';
    cancelButton.textContent = 'Cancel Move';
    cancelButton.addEventListener('click', () => {
      this.clearMoveHighlights();
      document.body.removeChild(cancelButton);
    });
    
    document.body.appendChild(cancelButton);
  }
  
  clearMoveHighlights() {
    document.querySelectorAll('.valid-move').forEach(element => {
      element.classList.remove('valid-move');
      
      // Clone to remove event listeners
      const newElement = element.cloneNode(true);
      element.parentNode.replaceChild(newElement, element);
    });
    
    const cancelButton = document.getElementById('cancel-move');
    if (cancelButton) {
      document.body.removeChild(cancelButton);
    }
  }
  
  startEstablishAction() {
    // Check if a square is selected
    if (!this.selectedSquare) {
      this.showMessage('Select a square to establish a business', 'error');
      return;
    }
    
    // Check if the square is controlled by the player
    if (this.selectedSquare.controlledBy !== this.gameState.playerGang.id) {
      this.showMessage('Can only establish businesses in territories you control', 'error');
      return;
    }
    
    // Check if the square already has a business
    if (this.selectedSquare.hasBusiness) {
      this.showMessage('This square already has a business', 'error');
      return;
    }
    
    // Get business types
    const businessTypes = this.gameState.economy.businessTypes;
    
    // Create content for business selection dialog
    const content = document.createElement('div');
    content.innerHTML = `
      <p>Select a business type to establish in territory (${this.selectedSquare.x}, ${this.selectedSquare.y}):</p>
      <p>Current Money: $${this.gameState.playerGang.money}</p>
      <div class="business-types-list">
        ${businessTypes.map(business => {
          const canAfford = this.gameState.playerGang.money >= business.cost;
          return `
            <div class="business-type ${canAfford ? '' : 'cannot-afford'}">
              <h4>${business.name}</h4>
              <p>Cost: $${business.cost}</p>
              <p>Income: $${business.income} per turn</p>
              <p>Heat: +${business.heat} per turn</p>
              <button class="establish-btn" data-business-type="${business.type}" ${canAfford ? '' : 'disabled'}>
                Establish ($${business.cost})
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Show dialog
    const dialog = this.showDialog('Establish Business', content);
    
    // Add event listeners for establish buttons
    dialog.querySelectorAll('.establish-btn').forEach(button => {
      button.addEventListener('click', () => {
        const businessType = button.dataset.businessType;
        
        // Try to establish the business
        const result = this.gameState.economy.establishBusiness(
          this.gameState.playerGang,
          businessType,
          this.selectedSquare
        );
        
        if (result.success) {
          this.showMessage(`Established ${result.business.name} for $${result.cost}`, 'success');
          this.updateMoneyDisplay(this.gameState.playerGang.money);
          this.updateGangDisplay(this.gameState.playerGang);
          this.updateBoardDisplay();
          this.closeDialog(dialog);
        } else {
          this.showMessage(`Failed to establish business: ${result.reason}`, 'error');
        }
      });
    });
  }
  
  startHealAction() {
    // Check if a gang member is selected
    if (!this.selectedGangMember) {
      this.showMessage('Select a gang member to heal first', 'error');
      return;
    }
    
    // Check if already at max health
    if (this.selectedGangMember.lives >= this.selectedGangMember.maxLives) {
      this.showMessage('This member is already at full health', 'error');
      return;
    }
    
    // Check if at healing location
    const isAtHealingLocation = 
      (this.selectedGangMember.square.specialLocation === 'hospital') ||
      (this.selectedGangMember.square === this.gameState.playerGang.homeBase);
    
    if (!isAtHealingLocation) {
      this.showMessage('Member must be at hospital or home base to heal', 'error');
      return;
    }
    
    // Perform healing
    const result = this.gameState.healGangMember(
      this.gameState.playerGang,
      this.selectedGangMember.id
    );
    
    if (result.success) {
      this.showMessage(`Healed ${this.selectedGangMember.type}. Lives: ${result.newLives}/${result.maxLives}`, 'success');
      this.updateGangDisplay(this.gameState.playerGang);
    } else {
      this.showMessage(`Failed to heal: ${result.reason}`, 'error');
    }
  }
  
  startAttackAction() {
    // Check if a gang member is selected
    if (!this.selectedGangMember) {
      this.showMessage('Select a gang member to attack with first', 'error');
      return;
    }
    
    // Check if there are enemies in the same square
    const square = this.selectedGangMember.square;
    
    if (!square) {
      this.showMessage('Member not on board', 'error');
      return;
    }
    
    // Find enemies in square
    const enemies = [];
    for (const gangId in square.gangMembers) {
      if (gangId === this.gameState.playerGang.id) continue; // Skip own gang
      
      square.gangMembers[gangId].forEach(member => {
        enemies.push({
          id: member.id,
          type: member.type,
          gangId: gangId,
          lives: member.lives,
          maxLives: member.maxLives
        });
      });
    }
    
    if (enemies.length === 0) {
      this.showMessage('No enemies in this square to attack', 'error');
      return;
    }
    
    // Create attack dialog
    const content = document.createElement('div');
    content.innerHTML = `
      <p>Select an enemy to attack:</p>
      <div class="enemy-list">
        ${enemies.map(enemy => {
          const gang = this.gameState.gangs.find(g => g.id === enemy.gangId);
          return `
            <div class="enemy-item" data-enemy-id="${enemy.id}" data-gang-id="${enemy.gangId}">
              <span class="enemy-gang" style="color: ${gang?.color || '#888'}">
                ${gang?.name || 'Unknown Gang'}
              </span>
              <span class="enemy-type">${enemy.type === 'boss' ? 'Boss' : 'Member'}</span>
              <span class="enemy-lives">Lives: ${enemy.lives}/${enemy.maxLives}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    const dialog = this.showDialog('Attack Enemy', content);
    
    // Add click handlers for enemies
    dialog.querySelectorAll('.enemy-item').forEach(item => {
      item.addEventListener('click', () => {
        const enemyId = item.dataset.enemyId;
        
        // Execute attack
        const result = this.gameState.initiateAttack(
          this.gameState.playerGang,
          this.selectedGangMember.id,
          enemyId
        );
        
        if (result.success) {
          const winner = result.winner === this.selectedGangMember.id ? 'You won' : 'You lost';
          const casualtyText = result.casualty ? 
            `${result.casualty.gangId === this.gameState.playerGang.id ? 'Your' : 'Enemy'} ${result.casualty.type} was killed!` : 
            '';
          
          this.showMessage(`${winner} the fight! ${casualtyText}`, result.winner === this.selectedGangMember.id ? 'success' : 'error');
          this.updateGangDisplay(this.gameState.playerGang);
          this.updateBoardDisplay();
          this.closeDialog(dialog);
        } else {
          this.showMessage(`Failed to attack: ${result.reason}`, 'error');
        }
      });
    });
  }
  
  // Save/Load methods
  saveGame() {
    const result = this.gameState.saveSystem.saveGame();
    
    if (result.success) {
      this.showMessage('Game saved successfully', 'success');
    } else {
      this.showMessage(`Failed to save game: ${result.error}`, 'error');
    }
  }
  
  confirmNewGame() {
    this.showDialog(
      'Start New Game',
      'Are you sure you want to start a new game? Any unsaved progress will be lost.',
      [
        {
          label: 'Cancel',
          type: 'default'
        },
        {
          label: 'New Game',
          type: 'primary',
          action: () => this.showGangSelectionScreen()
        }
      ]
    );
  }
  
  showGangSelectionScreen() {
    const content = document.createElement('div');
    content.innerHTML = `
      <h3>Choose Your Gang</h3>
      <div class="gang-selection">
        ${gangTypes.map(gang => `
          <div class="gang-option" data-gang-id="${gang.id}">
            <div class="gang-name" style="color: ${gang.color}">${gang.name}</div>
            <div class="gang-description">${gang.description}</div>
            <div class="gang-abilities">
              <strong>Special Abilities:</strong>
              <ul>
                ${gang.specialAbilities.map(ability => `<li>${this.getAbilityDescription(ability)}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    const dialog = this.showDialog('New Game - Five Boroughs', content, []);
    
    // Add selection handlers
    dialog.querySelectorAll('.gang-option').forEach(option => {
      option.addEventListener('click', () => {
        const gangId = option.dataset.gangId;
        this.startNewGame(gangId);
        this.closeDialog(dialog);
      });
    });
  }
  
  startNewGame(gangId) {
    // Clear any existing game
    if (this.gameState) {
      // Clean up any existing elements
      document.querySelectorAll('.board-square').forEach(el => {
        const newEl = el.cloneNode(false);
        if (el.parentNode) {
          el.parentNode.replaceChild(newEl, el);
        }
      });
    }
    
    // Start a new game with the selected gang
    this.gameState.startNewGame(gangId);
  }
  
  getAbilityDescription(abilityId) {
    const descriptions = {
      'protectionRacket': 'Protection Racket: Earn +$2 from each controlled business',
      'familyConnections': 'Family Connections: 20% discount on all weapons',
      'roadWarriors': 'Road Warriors: Move 2 squares per movement action',
      'intimidation': 'Intimidation: +20% to recruitment success chance',
      'codeOfHonor': 'Code of Honor: Gang members have +1 life',
      'businessFronts': 'Business Fronts: Businesses generate +$30 income',
      'drugLords': 'Drug Lords: Buy drugs at 25% discount, sell at 25% premium',
      'borderConnections': 'Border Connections: Start with extra money',
      'localKnowledge': 'Local Knowledge: Combat bonus in home borough',
      'recruitmentDrive': 'Recruitment Drive: New members cost 25% less'
    };
    
    return descriptions[abilityId] || abilityId;
  }
  
  enableActionButtons(enabled) {
    document.querySelectorAll('.action-button').forEach(button => {
      button.disabled = !enabled;
    });
  }
}
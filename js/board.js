// Sample code for rendering the 12x12 game board
class GameBoard {
  constructor() {
    this.gridSize = 12;
    this.squares = [];
    this.boroughs = {
      manhattan: { color: '#3a506b', squares: [] }, // Dark blue
      brooklyn: { color: '#5e548e', squares: [] },  // Dark purple
      bronx: { color: '#606c38', squares: [] },     // Dark green
      queens: { color: '#bc6c25', squares: [] },    // Dark orange
      statenIsland: { color: '#283618', squares: [] } // Dark olive
    };
    
    this.initializeBoard();
    this.assignBoroughs();
    this.placeSpecialLocations();
  }
  
  initializeBoard() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.squares.push({
          x,
          y,
          id: `${x}-${y}`,
          controlledBy: null,
          gangMembers: {},
          specialLocation: null,
          borough: null,
          incomeValue: Math.floor(Math.random() * 5) + 1, // $1-5 base income
          heatLevel: 0
        });
      }
    }
  }
  
  assignBoroughs() {
    // Divide the board into five boroughs with distinct areas
    // This is a simplified version - actual implementation would have more natural boundaries
    
    // Manhattan (center)
    for (let y = 4; y < 8; y++) {
      for (let x = 4; x < 8; x++) {
        const square = this.getSquare(x, y);
        square.borough = 'manhattan';
        square.incomeValue += 2; // Higher income in Manhattan
        this.boroughs.manhattan.squares.push(square);
      }
    }
    
    // Brooklyn (bottom right)
    for (let y = 8; y < 12; y++) {
      for (let x = 6; x < 12; x++) {
        const square = this.getSquare(x, y);
        square.borough = 'brooklyn';
        square.combatBonus = 1; // Combat bonus in Brooklyn
        this.boroughs.brooklyn.squares.push(square);
      }
    }
    
    // More borough assignments would follow...
  }
  
  placeSpecialLocations() {
    // Place police stations, hospitals, black markets, etc.
    const specialLocations = [
      { type: 'policeStation', x: 2, y: 2 },
      { type: 'policeStation', x: 9, y: 9 },
      { type: 'hospital', x: 5, y: 5 },
      { type: 'hospital', x: 8, y: 3 },
      { type: 'blackMarket', x: 10, y: 1 },
      { type: 'blackMarket', x: 1, y: 10 }
      // More locations would be defined
    ];
    
    specialLocations.forEach(loc => {
      const square = this.getSquare(loc.x, loc.y);
      square.specialLocation = loc.type;
    });
  }
  
  getSquare(x, y) {
    return this.squares.find(square => square.x === x && square.y === y);
  }
  
  render() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
    
    this.squares.forEach(square => {
      const squareElement = document.createElement('div');
      squareElement.id = `square-${square.id}`;
      squareElement.className = 'board-square';
      
      // Set borough color
      if (square.borough) {
        squareElement.style.backgroundColor = this.boroughs[square.borough].color;
      }
      
      // Add special location indicator if needed
      if (square.specialLocation) {
        const icon = document.createElement('div');
        icon.className = `location-icon ${square.specialLocation}`;
        squareElement.appendChild(icon);
      }
      
      // Add control markers
      if (square.controlledBy) {
        squareElement.classList.add(`controlled-by-${square.controlledBy}`);
      }
      
      // Add gang members representations
      Object.keys(square.gangMembers).forEach(gangId => {
        const members = square.gangMembers[gangId];
        if (members.length > 0) {
          const memberIndicator = document.createElement('div');
          memberIndicator.className = `gang-member ${gangId}`;
          memberIndicator.textContent = members.length;
          squareElement.appendChild(memberIndicator);
        }
      });
      
      // Add click event for selecting squares
      squareElement.addEventListener('click', () => this.handleSquareClick(square));
      
      boardElement.appendChild(squareElement);
    });
  }
  
  handleSquareClick(square) {
    // This will be connected to the game's action system
    gameController.selectSquare(square);
  }
}
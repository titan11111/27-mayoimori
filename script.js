// ゲームの設定
const GAME_CONFIG = {
    FIELD_SIZE: 10,
    WALL_PROBABILITY: 0.3,
    VISION_RADIUS: 1
};

// ゲームの状態
let gameState = {
    field: [],
    player: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    steps: 0,
    gameOver: false,
    discovered: []
};

// セルの種類
const CELL_TYPES = {
    WALL: 'wall',
    PATH: 'path',
    PLAYER: 'player',
    EXIT: 'exit',
    UNKNOWN: 'unknown'
};

// セルの表示文字
const CELL_SYMBOLS = {
    wall: '🌳',
    path: '　',
    player: '🧑',
    exit: '🚪',
    unknown: '？'
};

// DOM要素の取得
const gameField = document.getElementById('gameField');
const stepCount = document.getElementById('stepCount');
const gameStatus = document.getElementById('gameStatus');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const restartBtn = document.getElementById('restartBtn');

// ゲーム初期化
function initGame() {
    gameState = {
        field: [],
        player: { x: 0, y: 0 },
        exit: { x: 0, y: 0 },
        steps: 0,
        gameOver: false,
        discovered: []
    };
    
    generateField();
    updateDisplay();
    updateUI();
}

// フィールド生成
function generateField() {
    const size = GAME_CONFIG.FIELD_SIZE;
    gameState.field = [];
    gameState.discovered = [];
    
    // 基本のフィールドを生成
    for (let y = 0; y < size; y++) {
        gameState.field[y] = [];
        gameState.discovered[y] = [];
        for (let x = 0; x < size; x++) {
            // 外周は壁にする
            if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
                gameState.field[y][x] = CELL_TYPES.WALL;
            } else {
                // ランダムに壁を配置
                gameState.field[y][x] = Math.random() < GAME_CONFIG.WALL_PROBABILITY ? 
                    CELL_TYPES.WALL : CELL_TYPES.PATH;
            }
            gameState.discovered[y][x] = false;
        }
    }
    
    // プレイヤーの開始位置を設定（左上の角近く）
    gameState.player.x = 1;
    gameState.player.y = 1;
    gameState.field[1][1] = CELL_TYPES.PATH;
    
    // 出口の位置を設定（右下の角近く）
    gameState.exit.x = size - 2;
    gameState.exit.y = size - 2;
    gameState.field[size - 2][size - 2] = CELL_TYPES.PATH;
    
    // 開始位置周辺を発見済みにする
    updateVision();
}

// 視界の更新
function updateVision() {
    const radius = GAME_CONFIG.VISION_RADIUS;
    const px = gameState.player.x;
    const py = gameState.player.y;
    
    for (let y = Math.max(0, py - radius); y <= Math.min(GAME_CONFIG.FIELD_SIZE - 1, py + radius); y++) {
        for (let x = Math.max(0, px - radius); x <= Math.min(GAME_CONFIG.FIELD_SIZE - 1, px + radius); x++) {
            gameState.discovered[y][x] = true;
        }
    }
}

// 表示の更新
function updateDisplay() {
    gameField.innerHTML = '';
    
    for (let y = 0; y < GAME_CONFIG.FIELD_SIZE; y++) {
        for (let x = 0; x < GAME_CONFIG.FIELD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (!gameState.discovered[y][x]) {
                // 未発見のセル
                cell.classList.add(CELL_TYPES.UNKNOWN);
                cell.textContent = CELL_SYMBOLS.unknown;
            } else if (x === gameState.player.x && y === gameState.player.y) {
                // プレイヤーの位置
                cell.classList.add(CELL_TYPES.PLAYER);
                cell.textContent = CELL_SYMBOLS.player;
            } else if (x === gameState.exit.x && y === gameState.exit.y) {
                // 出口
                cell.classList.add(CELL_TYPES.EXIT);
                cell.textContent = CELL_SYMBOLS.exit;
            } else {
                // 通常のセル
                const cellType = gameState.field[y][x];
                cell.classList.add(cellType);
                cell.textContent = CELL_SYMBOLS[cellType];
            }
            
            gameField.appendChild(cell);
        }
    }
}

// UI の更新
function updateUI() {
    stepCount.textContent = gameState.steps;
    
    if (gameState.gameOver) {
        gameStatus.textContent = 'クリア！';
        gameStatus.style.color = '#FF69B4';
    } else {
        gameStatus.textContent = '探索中';
        gameStatus.style.color = '#4a7c59';
    }
}

// プレイヤーの移動
function movePlayer(dx, dy) {
    if (gameState.gameOver) return;
    
    const newX = gameState.player.x + dx;
    const newY = gameState.player.y + dy;
    
    // 境界チェック
    if (newX < 0 || newX >= GAME_CONFIG.FIELD_SIZE || 
        newY < 0 || newY >= GAME_CONFIG.FIELD_SIZE) {
        return;
    }
    
    // 壁のチェック
    if (gameState.field[newY][newX] === CELL_TYPES.WALL) {
        return;
    }
    
    // 移動実行
    gameState.player.x = newX;
    gameState.player.y = newY;
    gameState.steps++;
    
    // 視界更新
    updateVision();
    
    // 出口に到達したかチェック
    if (newX === gameState.exit.x && newY === gameState.exit.y) {
        gameState.gameOver = true;
    }
    
    updateDisplay();
    updateUI();
}

// キーボードイベント
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            movePlayer(0, -1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            movePlayer(0, 1);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
            e.preventDefault();
            movePlayer(1, 0);
            break;
    }
});

// ボタンイベント
upBtn.addEventListener('click', () => movePlayer(0, -1));
downBtn.addEventListener('click', () => movePlayer(0, 1));
leftBtn.addEventListener('click', () => movePlayer(-1, 0));
rightBtn.addEventListener('click', () => movePlayer(1, 0));
restartBtn.addEventListener('click', initGame);

// タッチイベント（スマホ対応）
let startX = 0;
let startY = 0;

gameField.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
});

gameField.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    
    const threshold = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > threshold) {
            movePlayer(1, 0);
        } else if (deltaX < -threshold) {
            movePlayer(-1, 0);
        }
    } else {
        if (deltaY > threshold) {
            movePlayer(0, 1);
        } else if (deltaY < -threshold) {
            movePlayer(0, -1);
        }
    }
});

// ゲーム開始
initGame();
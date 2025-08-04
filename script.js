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
    cpu: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    steps: 0,
    gameOver: false,
    winner: null,
    discovered: []
};

// セルの種類
const CELL_TYPES = {
    WALL: 'wall',
    PATH: 'path',
    PLAYER: 'player',
    EXIT: 'exit',
    CPU: 'cpu',
    UNKNOWN: 'unknown'
};

// セルの表示文字
const CELL_SYMBOLS = {
    wall: '🌳',
    path: '　',
    player: '🧑',
    exit: '🚪',
    cpu: '🤖',
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
const bgm = document.getElementById('bgm');

// オーディオ設定
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let ambienceStarted = false;
let cpuInterval;

function playStepSound() {
    audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playForestAmbience() {
    audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.02;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    source.connect(filter);
    filter.connect(audioCtx.destination);
    source.start();
}

function finishGame(winner) {
    gameState.gameOver = true;
    gameState.winner = winner;
    clearInterval(cpuInterval);
}

// ゲーム初期化
function initGame() {
    gameState = {
        field: [],
        player: { x: 0, y: 0 },
        cpu: { x: 0, y: 0 },
        exit: { x: 0, y: 0 },
        steps: 0,
        gameOver: false,
        winner: null,
        discovered: []
    };

    generateField();
    updateDisplay();
    updateUI();
    clearInterval(cpuInterval);
    cpuInterval = setInterval(moveCPU, 500);
}

function getRandomFarCell() {
    const size = GAME_CONFIG.FIELD_SIZE;
    let x, y;
    do {
        x = Math.floor(Math.random() * (size - 2)) + 1;
        y = Math.floor(Math.random() * (size - 2)) + 1;
    } while (
        gameState.field[y][x] !== CELL_TYPES.PATH ||
        (Math.abs(x - gameState.player.x) + Math.abs(y - gameState.player.y) < size / 2) ||
        (x === gameState.exit.x && y === gameState.exit.y)
    );
    return { x, y };
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

    // プレイヤーが開始直後に動けるように右と下のマスを必ず道にする
    gameState.field[1][2] = CELL_TYPES.PATH;
    gameState.field[2][1] = CELL_TYPES.PATH;
    
    // 出口の位置を設定（右下の角近く）
    gameState.exit.x = size - 2;
    gameState.exit.y = size - 2;
    gameState.field[size - 2][size - 2] = CELL_TYPES.PATH;

    // CPUの開始位置を設定（プレイヤーと離れた位置）
    const cpuPos = getRandomFarCell();
    gameState.cpu.x = cpuPos.x;
    gameState.cpu.y = cpuPos.y;
    gameState.field[cpuPos.y][cpuPos.x] = CELL_TYPES.PATH;

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
            
            if (x === gameState.player.x && y === gameState.player.y) {
                // プレイヤーの位置
                cell.classList.add(CELL_TYPES.PLAYER);
                const img = document.createElement('img');
                img.src = 'images/player.svg';
                img.className = 'player-img';
                img.alt = 'player';
                cell.appendChild(img);
            } else if (x === gameState.cpu.x && y === gameState.cpu.y) {
                // CPUの位置
                cell.classList.add(CELL_TYPES.CPU);
                cell.textContent = CELL_SYMBOLS.cpu;
            } else if (!gameState.discovered[y][x]) {
                // 未発見のセル
                cell.classList.add(CELL_TYPES.UNKNOWN);
                cell.textContent = CELL_SYMBOLS.unknown;
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
        if (gameState.winner === 'player') {
            gameStatus.textContent = 'プレイヤーの勝ち！';
            gameStatus.style.color = '#FF69B4';
        } else if (gameState.winner === 'cpu') {
            gameStatus.textContent = 'CPUの勝ち！';
            gameStatus.style.color = '#FF4500';
        }
    } else {
        gameStatus.textContent = '探索中';
        gameStatus.style.color = '#4a7c59';
    }
}

function findPath(startX, startY, targetX, targetY) {
    const size = GAME_CONFIG.FIELD_SIZE;
    const queue = [{ x: startX, y: startY, path: [] }];
    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    visited[startY][startX] = true;
    const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
    ];

    while (queue.length) {
        const { x, y, path } = queue.shift();
        if (x === targetX && y === targetY) {
            return [...path, { x, y }];
        }
        for (const { dx, dy } of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            if (visited[ny][nx]) continue;
            if (gameState.field[ny][nx] === CELL_TYPES.WALL) continue;
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny, path: [...path, { x, y }] });
        }
    }
    return [{ x: startX, y: startY }];
}

function moveCPU() {
    if (gameState.gameOver) return;

    const path = findPath(
        gameState.cpu.x,
        gameState.cpu.y,
        gameState.exit.x,
        gameState.exit.y
    );

    if (path.length > 1) {
        gameState.cpu.x = path[1].x;
        gameState.cpu.y = path[1].y;
    } else {
        // パスが見つからない場合はランダムに移動
        const dirs = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];
        const moves = dirs
            .map(({ dx, dy }) => ({ x: gameState.cpu.x + dx, y: gameState.cpu.y + dy }))
            .filter(({ x, y }) =>
                x >= 0 && x < GAME_CONFIG.FIELD_SIZE &&
                y >= 0 && y < GAME_CONFIG.FIELD_SIZE &&
                gameState.field[y][x] !== CELL_TYPES.WALL
            );
        if (moves.length) {
            const move = moves[Math.floor(Math.random() * moves.length)];
            gameState.cpu.x = move.x;
            gameState.cpu.y = move.y;
        }
    }

    if (gameState.cpu.x === gameState.exit.x && gameState.cpu.y === gameState.exit.y) {
        finishGame('cpu');
    }

    updateDisplay();
    updateUI();
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

    playStepSound();
    if (!ambienceStarted) {
        playForestAmbience();
        bgm.play();
        ambienceStarted = true;
    }
    
    // 視界更新
    updateVision();

    // 出口に到達したかチェック
    if (newX === gameState.exit.x && newY === gameState.exit.y) {
        finishGame('player');
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

// ボタンイベント（クリック・タッチ共通）
[
    { btn: upBtn, dx: 0, dy: -1 },
    { btn: downBtn, dx: 0, dy: 1 },
    { btn: leftBtn, dx: -1, dy: 0 },
    { btn: rightBtn, dx: 1, dy: 0 }
].forEach(({ btn, dx, dy }) => {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        movePlayer(dx, dy);
    });
});
restartBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initGame();
});

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

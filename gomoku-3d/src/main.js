// ============================================
// 3D五子棋游戏 - 主逻辑文件 (改进版)
// ============================================

(function() {
    'use strict';

    // ==========================================
    // 游戏配置常量
    // ==========================================
    const CONFIG = {
        BOARD_SIZE: 15,
        CELL_SIZE: 1,
        BOARD_PADDING: 0.5,
        PLAYER_HUMAN: 1,
        PLAYER_AI: -1,
        EMPTY: 0,
        WIN_LENGTH: 5,
        ANIMATION_SPEED: 800,
        AI_THINK_TIME: {
            easy: 300,
            medium: 1000,
            hard: 2000
        }
    };

    // ==========================================
    // 游戏状态管理
    // ==========================================
    class GameState {
        constructor() {
            this.board = [];
            this.currentPlayer = CONFIG.PLAYER_HUMAN;
            this.moves = [];
            this.gameOver = false;
            this.winner = null;
            this.difficulty = 'medium';
            this.isPaused = false;
            this.isPlaying = false;
            
            this.totalTime = 0;
            this.currentStepTime = 0;
            this.timerInterval = null;
            this.lastMoveTime = Date.now();
            
            this.gameRecord = null;
            
            this.initBoard();
        }

        initBoard() {
            this.board = Array(CONFIG.BOARD_SIZE).fill(null)
                .map(() => Array(CONFIG.BOARD_SIZE).fill(CONFIG.EMPTY));
        }

        reset() {
            this.initBoard();
            this.currentPlayer = CONFIG.PLAYER_HUMAN;
            this.moves = [];
            this.gameOver = false;
            this.winner = null;
            this.isPaused = false;
            this.isPlaying = false;
            this.totalTime = 0;
            this.currentStepTime = 0;
            this.lastMoveTime = Date.now();
            this.gameRecord = {
                id: Date.now(),
                startTime: new Date().toISOString(),
                moves: [],
                difficulty: this.difficulty,
                result: null,
                duration: 0
            };
            this.stopTimer();
        }

        makeMove(x, y) {
            if (this.board[x][y] !== CONFIG.EMPTY || this.gameOver) {
                return false;
            }

            this.board[x][y] = this.currentPlayer;
            this.moves.push({ x, y, player: this.currentPlayer, time: Date.now() });
            
            this.gameRecord.moves.push({ x, y, player: this.currentPlayer });
            
            console.log(`makeMove at (${x}, ${y}), player: ${this.currentPlayer}`);
            
            if (this.checkWin(x, y)) {
                this.gameOver = true;
                this.winner = this.currentPlayer;
                this.gameRecord.result = this.currentPlayer === CONFIG.PLAYER_HUMAN ? 'win' : 'lose';
                this.gameRecord.duration = this.totalTime;
                this.stopTimer();
                console.log(`Game Over! Winner: ${this.winner}`);
                return true;
            }

            if (this.moves.length === CONFIG.BOARD_SIZE * CONFIG.BOARD_SIZE) {
                this.gameOver = true;
                this.winner = null;
                this.gameRecord.result = 'draw';
                this.gameRecord.duration = this.totalTime;
                this.stopTimer();
                return true;
            }

            this.currentPlayer = this.currentPlayer === CONFIG.PLAYER_HUMAN ? 
                CONFIG.PLAYER_AI : CONFIG.PLAYER_HUMAN;
            this.currentStepTime = 0;
            this.lastMoveTime = Date.now();
            
            return true;
        }

        checkWin(x, y) {
            const player = this.board[x][y];
            const directions = [
                [[1, 0], [-1, 0]],
                [[0, 1], [0, -1]],
                [[1, 1], [-1, -1]],
                [[1, -1], [-1, 1]]
            ];

            for (const [dir1, dir2] of directions) {
                let count = 1;
                count += this.countDirection(x, y, player, dir1);
                count += this.countDirection(x, y, player, dir2);
                
                console.log(`checkWin at (${x}, ${y}), player: ${player}, direction: [${dir1}], count: ${count}`);
                
                if (count >= CONFIG.WIN_LENGTH) {
                    console.log(`WIN DETECTED! Player ${player} wins at (${x}, ${y})`);
                    return true;
                }
            }
            return false;
        }

        countDirection(x, y, player, direction) {
            let count = 0;
            let dx = direction[0];
            let dy = direction[1];
            
            let nx = x + dx;
            let ny = y + dy;
            
            while (nx >= 0 && nx < CONFIG.BOARD_SIZE && 
                   ny >= 0 && ny < CONFIG.BOARD_SIZE && 
                   this.board[nx][ny] === player) {
                count++;
                nx += dx;
                ny += dy;
            }
            
            return count;
        }

        undoMove() {
            if (this.moves.length === 0) return false;
            
            const lastMove = this.moves.pop();
            this.board[lastMove.x][lastMove.y] = CONFIG.EMPTY;
            this.gameRecord.moves.pop();
            
            this.currentPlayer = lastMove.player;
            this.gameOver = false;
            this.winner = null;
            
            return true;
        }

        startTimer() {
            if (this.timerInterval) return;
            this.lastMoveTime = Date.now();
            this.timerInterval = setInterval(() => {
                if (!this.isPaused && this.isPlaying) {
                    const now = Date.now();
                    const delta = now - this.lastMoveTime;
                    this.lastMoveTime = now;
                    this.currentStepTime += delta;
                    this.totalTime += delta;
                    updateTimerDisplay();
                }
            }, 100);
        }

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }

        pause() {
            this.isPaused = true;
        }

        resume() {
            this.isPaused = false;
            this.lastMoveTime = Date.now();
        }
    }

    // ==========================================
    // 位置权重矩阵
    // ==========================================
    const POSITION_WEIGHTS = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
        [0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 5, 6, 6, 6, 5, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 5, 6, 6, 6, 5, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1, 0],
        [0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0],
        [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // ==========================================
    // 转置表
    // ==========================================
    class TranspositionTable {
        constructor(maxSize = 100000) {
            this.table = new Map();
            this.maxSize = maxSize;
            this.hits = 0;
            this.misses = 0;
        }
        
        store(hash, depth, score, flag, move) {
            if (this.table.size >= this.maxSize) {
                const firstKey = this.table.keys().next().value;
                this.table.delete(firstKey);
            }
            this.table.set(hash, { depth, score, flag, move });
        }
        
        lookup(hash, depth) {
            const entry = this.table.get(hash);
            if (entry && entry.depth >= depth) {
                this.hits++;
                return entry;
            }
            this.misses++;
            return null;
        }
        
        clear() {
            this.table.clear();
            this.hits = 0;
            this.misses = 0;
        }
        
        getHitRate() {
            const total = this.hits + this.misses;
            return total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
        }
    }

    // ==========================================
    // Zobrist哈希
    // ==========================================
    class ZobristHash {
        constructor() {
            this.table = [];
            this.init();
        }
        
        init() {
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                this.table[i] = [];
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    this.table[i][j] = {
                        [CONFIG.PLAYER_HUMAN]: Math.floor(Math.random() * 0xFFFFFFFF),
                        [CONFIG.PLAYER_AI]: Math.floor(Math.random() * 0xFFFFFFFF)
                    };
                }
            }
        }
        
        compute(board) {
            let hash = 0;
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (board[i][j] !== CONFIG.EMPTY) {
                        hash ^= this.table[i][j][board[i][j]];
                    }
                }
            }
            return hash;
        }
    }

    // ==========================================
    // AI算法 - 改进版
    // ==========================================
    class AI {
        constructor(difficulty = 'medium') {
            this.difficulty = difficulty;
            this.evaluator = new PositionEvaluator();
            this.tt = new TranspositionTable(100000);
            this.zobrist = new ZobristHash();
            this.maxTime = 3000;
            this.history = new Map();
            this.killerMoves = new Map();
            this.openingBook = this.createOpeningBook();
        }

        setDifficulty(difficulty) {
            this.difficulty = difficulty;
            switch (difficulty) {
                case 'easy':
                    this.maxTime = 500;
                    break;
                case 'medium':
                    this.maxTime = 2000;
                    break;
                case 'hard':
                    this.maxTime = 5000;
                    break;
            }
        }

        createOpeningBook() {
            const center = 7;
            return [
                { x: center, y: center },
                { x: center - 3, y: center - 3 },
                { x: center - 3, y: center + 3 },
                { x: center + 3, y: center - 3 },
                { x: center + 3, y: center + 3 },
                { x: center - 4, y: center },
                { x: center + 4, y: center },
                { x: center, y: center - 4 },
                { x: center, y: center + 4 }
            ];
        }

        getBestMove(gameState) {
            this.tt.clear();
            this.history.clear();
            this.killerMoves.clear();
            const moveCount = this.countPieces(gameState.board);
            
            if (moveCount < 4) {
                return this.getOpeningMove(gameState);
            }
            
            switch (this.difficulty) {
                case 'easy':
                    return this.getRandomMove(gameState);
                case 'medium':
                    return this.getMediumMove(gameState);
                case 'hard':
                    return this.getHardMove(gameState);
                default:
                    return this.getMediumMove(gameState);
            }
        }

        countPieces(board) {
            let count = 0;
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (board[i][j] !== CONFIG.EMPTY) count++;
                }
            }
            return count;
        }

        getOpeningMove(gameState) {
            const center = Math.floor(CONFIG.BOARD_SIZE / 2);
            if (gameState.board[center][center] === CONFIG.EMPTY) {
                return { x: center, y: center };
            }
            const starPoints = [
                { x: center - 3, y: center - 3 }, { x: center - 3, y: center + 3 },
                { x: center + 3, y: center - 3 }, { x: center + 3, y: center + 3 }
            ];
            for (const pos of starPoints) {
                if (gameState.board[pos.x][pos.y] === CONFIG.EMPTY) {
                    return pos;
                }
            }
            return { x: center, y: center };
        }

        getRandomMove(gameState) {
            const emptyPositions = [];
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        emptyPositions.push({ x: i, y: j });
                    }
                }
            }
            if (emptyPositions.length === 0) return null;
            return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        }

        getMediumMove(gameState) {
            const winMove = this.findWinningMove(gameState, CONFIG.PLAYER_AI);
            if (winMove) return winMove;
            
            const blockMove = this.findWinningMove(gameState, CONFIG.PLAYER_HUMAN);
            if (blockMove) return blockMove;
            
            const doubleThreeBlock = this.findDoubleThreeBlock(gameState);
            if (doubleThreeBlock) return doubleThreeBlock;
            
            const fourThreeBlock = this.findFourThreeBlock(gameState);
            if (fourThreeBlock) return fourThreeBlock;
            
            const blockOpenThree = this.findOpenThreeBlock(gameState);
            if (blockOpenThree) return blockOpenThree;
            
            let moves = this.getSmartMoves(gameState);
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            this.sortMovesWithKiller(gameState, moves, CONFIG.PLAYER_AI);
            
            let bestScore = -Infinity;
            let bestMove = moves[0];
            
            for (const move of moves.slice(0, 15)) {
                gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                
                if (this.checkWin(move.x, move.y, CONFIG.PLAYER_AI, gameState.board)) {
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    return move;
                }
                
                gameState.board[move.x][move.y] = CONFIG.PLAYER_HUMAN;
                if (this.checkWin(move.x, move.y, CONFIG.PLAYER_HUMAN, gameState.board)) {
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                    const score = this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = move;
                    }
                    continue;
                }
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                const score = this.evaluateMove(gameState, move.x, move.y, CONFIG.PLAYER_AI);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            
            return bestMove;
        }

        findOpenThreeBlock(gameState) {
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        gameState.board[i][j] = CONFIG.PLAYER_HUMAN;
                        const threats = this.countThreats(gameState.board, i, j, CONFIG.PLAYER_HUMAN);
                        
                        if (threats.openThree >= 1) {
                            gameState.board[i][j] = CONFIG.EMPTY;
                            return { x: i, y: j };
                        }
                        gameState.board[i][j] = CONFIG.EMPTY;
                    }
                }
            }
            return null;
        }

        getHardMove(gameState) {
            const startTime = Date.now();
            
            const winMove = this.findWinningMove(gameState, CONFIG.PLAYER_AI);
            if (winMove) return winMove;
            
            const blockMove = this.findWinningMove(gameState, CONFIG.PLAYER_HUMAN);
            if (blockMove) return blockMove;
            
            const doubleThreeBlock = this.findDoubleThreeBlock(gameState);
            if (doubleThreeBlock) return doubleThreeBlock;
            
            const fourThreeBlock = this.findFourThreeBlock(gameState);
            if (fourThreeBlock) return fourThreeBlock;
            
            let bestMove = null;
            let bestScore = -Infinity;
            
            let moves = this.getSmartMoves(gameState);
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            this.sortMovesWithKiller(gameState, moves, CONFIG.PLAYER_AI);
            
            for (let depth = 2; depth <= 8; depth++) {
                if (Date.now() - startTime > this.maxTime * 0.8) break;
                
                let alpha = -Infinity;
                let beta = Infinity;
                let currentBest = null;
                
                for (let i = 0; i < Math.min(moves.length, 25); i++) {
                    const move = moves[i];
                    if (Date.now() - startTime > this.maxTime) break;
                    
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                    
                    if (this.checkWin(move.x, move.y, CONFIG.PLAYER_AI, gameState.board)) {
                        gameState.board[move.x][move.y] = CONFIG.EMPTY;
                        this.addKillerMove(depth, move);
                        return move;
                    }
                    
                    const score = this.negamax(gameState, depth - 1, -beta, -alpha, CONFIG.PLAYER_HUMAN, startTime);
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    
                    if (score > alpha) {
                        alpha = score;
                        currentBest = move;
                    }
                }
                
                if (currentBest) {
                    bestMove = currentBest;
                    bestScore = alpha;
                }
            }
            
            return bestMove || moves[0];
        }

        addKillerMove(depth, move) {
            const key = depth;
            if (!this.killerMoves.has(key)) {
                this.killerMoves.set(key, []);
            }
            const killers = this.killerMoves.get(key);
            if (!killers.find(m => m.x === move.x && m.y === move.y)) {
                killers.unshift(move);
                if (killers.length > 2) killers.pop();
            }
        }

        getKillerMoves(depth) {
            return this.killerMoves.get(depth) || [];
        }

        negamax(gameState, depth, alpha, beta, player, startTime) {
            if (Date.now() - startTime > this.maxTime) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }
            
            const hash = this.zobrist.compute(gameState.board);
            const ttEntry = this.tt.lookup(hash, depth);
            if (ttEntry) {
                if (ttEntry.flag === 0) return ttEntry.score;
                if (ttEntry.flag === 1 && ttEntry.score >= beta) return ttEntry.score;
                if (ttEntry.flag === -1 && ttEntry.score <= alpha) return ttEntry.score;
            }
            
            if (depth === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            let moves = this.getSmartMoves(gameState);
            if (moves.length === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            this.sortMovesWithKiller(gameState, moves, player);
            moves = moves.slice(0, 20);
            
            let maxScore = -Infinity;
            let bestMove = null;
            
            for (const move of moves) {
                if (Date.now() - startTime > this.maxTime) break;
                
                gameState.board[move.x][move.y] = player;
                
                if (this.checkWin(move.x, move.y, player, gameState.board)) {
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    return 100000 * player;
                }
                
                const score = -this.negamax(gameState, depth - 1, -beta, -alpha, 
                    player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI, startTime);
                
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                if (score > maxScore) {
                    maxScore = score;
                    bestMove = move;
                }
                
                if (maxScore > alpha) {
                    alpha = maxScore;
                }
                
                if (alpha >= beta) {
                    this.addKillerMove(depth, move);
                    break;
                }
            }
            
            let flag = 0;
            if (maxScore <= alpha) flag = -1;
            else if (maxScore >= beta) flag = 1;
            
            this.tt.store(hash, depth, maxScore, flag, bestMove);
            
            return maxScore;
        }

        getSmartMoves(gameState) {
            const moves = new Map();
            const checked = new Set();
            
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] !== CONFIG.EMPTY) {
                        for (let di = -4; di <= 4; di++) {
                            for (let dj = -4; dj <= 4; dj++) {
                                const ni = i + di;
                                const nj = j + dj;
                                const key = `${ni},${nj}`;
                                
                                if (ni >= 0 && ni < CONFIG.BOARD_SIZE && 
                                    nj >= 0 && nj < CONFIG.BOARD_SIZE &&
                                    gameState.board[ni][nj] === CONFIG.EMPTY &&
                                    !checked.has(key)) {
                                    
                                    checked.add(key);
                                    const priority = this.evaluateMovePriority(gameState, ni, nj);
                                    moves.set(key, { x: ni, y: nj, priority });
                                }
                            }
                        }
                    }
                }
            }
            
            if (moves.size === 0) {
                const center = Math.floor(CONFIG.BOARD_SIZE / 2);
                return [{ x: center, y: center }];
            }
            
            const result = Array.from(moves.values());
            result.sort((a, b) => b.priority - a.priority);
            return result.slice(0, 60);
        }

        evaluateMovePriority(gameState, x, y) {
            let priority = 0;
            
            gameState.board[x][y] = CONFIG.PLAYER_AI;
            const attack = this.evaluator.evaluatePosition(gameState.board, x, y, CONFIG.PLAYER_AI);
            if (attack.five) priority += 100000;
            else if (attack.openFour) priority += 50000;
            else if (attack.four) priority += 10000;
            else if (attack.openThree) priority += 5000;
            gameState.board[x][y] = CONFIG.EMPTY;
            
            gameState.board[x][y] = CONFIG.PLAYER_HUMAN;
            const defend = this.evaluator.evaluatePosition(gameState.board, x, y, CONFIG.PLAYER_HUMAN);
            if (defend.five) priority += 80000;
            else if (defend.openFour) priority += 40000;
            else if (defend.four) priority += 8000;
            else if (defend.openThree) priority += 4000;
            gameState.board[x][y] = CONFIG.EMPTY;
            
            const center = CONFIG.BOARD_SIZE / 2;
            const dist = Math.abs(x - center) + Math.abs(y - center);
            priority += (14 - dist) * 5;
            
            return priority;
        }

        sortMovesWithKiller(gameState, moves, player) {
            const opponent = player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI;
            const killers = this.getKillerMoves(5);
            
            for (const move of moves) {
                let priority = 0;
                
                const isKiller = killers.find(m => m.x === move.x && m.y === move.y);
                if (isKiller) priority += 30000;
                
                gameState.board[move.x][move.y] = player;
                const attack = this.countThreats(gameState.board, move.x, move.y, player);
                if (attack.four >= 1) priority += 50000;
                else if (attack.openThree >= 1) priority += 5000;
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                gameState.board[move.x][move.y] = opponent;
                const defend = this.countThreats(gameState.board, move.x, move.y, opponent);
                if (defend.four >= 1) priority += 40000;
                else if (defend.openThree >= 1) priority += 4000;
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                const center = CONFIG.BOARD_SIZE / 2;
                const dist = Math.abs(move.x - center) + Math.abs(move.y - center);
                priority += (14 - dist) * 10;
                
                move.priority = priority;
            }
            
            moves.sort((a, b) => b.priority - a.priority);
        }

        findDoubleThreeBlock(gameState) {
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        gameState.board[i][j] = CONFIG.PLAYER_HUMAN;
                        const threats = this.countThreats(gameState.board, i, j, CONFIG.PLAYER_HUMAN);
                        
                        if (threats.openThree >= 2 || (threats.openThree >= 1 && threats.four >= 1)) {
                            gameState.board[i][j] = CONFIG.EMPTY;
                            return { x: i, y: j };
                        }
                        gameState.board[i][j] = CONFIG.EMPTY;
                    }
                }
            }
            return null;
        }

        findFourThreeBlock(gameState) {
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        gameState.board[i][j] = CONFIG.PLAYER_HUMAN;
                        const threats = this.countThreats(gameState.board, i, j, CONFIG.PLAYER_HUMAN);
                        
                        if (threats.four >= 1 && threats.openThree >= 1) {
                            gameState.board[i][j] = CONFIG.EMPTY;
                            return { x: i, y: j };
                        }
                        gameState.board[i][j] = CONFIG.EMPTY;
                    }
                }
            }
            return null;
        }

        countThreats(board, x, y, player) {
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let openThree = 0;
            let four = 0;
            
            for (const [dx, dy] of directions) {
                const info = this.analyzeDirection(board, x, y, dx, dy, player);
                if (info.count === 3 && info.openEnds === 2) openThree++;
                if (info.count === 4) four++;
            }
            
            return { openThree, four };
        }

        analyzeDirection(board, x, y, dx, dy, player) {
            let count = 1;
            let openEnds = 0;
            
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                if (board[nx][ny] === player) count++;
                else if (board[nx][ny] === CONFIG.EMPTY) { openEnds = 1; break; }
                else break;
            }
            
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                if (board[nx][ny] === player) count++;
                else if (board[nx][ny] === CONFIG.EMPTY) { if (openEnds === 0) openEnds = 1; else openEnds = 2; break; }
                else break;
            }
            
            return { count, openEnds };
        }

        sortMovesByThreat(gameState, moves, player) {
            const opponent = player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI;
            
            for (const move of moves) {
                let priority = 0;
                
                gameState.board[move.x][move.y] = player;
                const attackThreats = this.countThreats(gameState.board, move.x, move.y, player);
                if (attackThreats.four >= 1) priority += 50000;
                else if (attackThreats.openThree >= 1) priority += 5000;
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                gameState.board[move.x][move.y] = opponent;
                const defendThreats = this.countThreats(gameState.board, move.x, move.y, opponent);
                if (defendThreats.four >= 1) priority += 40000;
                else if (defendThreats.openThree >= 1) priority += 4000;
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                const center = CONFIG.BOARD_SIZE / 2;
                const dist = Math.abs(move.x - center) + Math.abs(move.y - center);
                priority += (14 - dist) * 10;
                
                const historyKey = `${move.x},${move.y}`;
                if (this.history.has(historyKey)) {
                    priority += this.history.get(historyKey);
                }
                
                move.priority = priority;
            }
            
            moves.sort((a, b) => b.priority - a.priority);
        }

        getValidMoves(gameState, range) {
            const moves = [];
            const checked = new Set();
            
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] !== CONFIG.EMPTY) {
                        for (let di = -range; di <= range; di++) {
                            for (let dj = -range; dj <= range; dj++) {
                                const ni = i + di;
                                const nj = j + dj;
                                const key = `${ni},${nj}`;
                                
                                if (ni >= 0 && ni < CONFIG.BOARD_SIZE && 
                                    nj >= 0 && nj < CONFIG.BOARD_SIZE &&
                                    gameState.board[ni][nj] === CONFIG.EMPTY &&
                                    !checked.has(key)) {
                                    checked.add(key);
                                    moves.push({ x: ni, y: nj });
                                }
                            }
                        }
                    }
                }
            }
            
            if (moves.length === 0) {
                const center = Math.floor(CONFIG.BOARD_SIZE / 2);
                moves.push({ x: center, y: center });
            }
            
            return moves.slice(0, 50);
        }

        evaluateMove(gameState, x, y, player) {
            gameState.board[x][y] = player;
            const score = this.evaluator.evaluateBoard(gameState.board, player);
            gameState.board[x][y] = CONFIG.EMPTY;
            return score;
        }

        findWinningMove(gameState, player) {
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        gameState.board[i][j] = player;
                        if (this.checkWin(i, j, player, gameState.board)) {
                            gameState.board[i][j] = CONFIG.EMPTY;
                            return { x: i, y: j };
                        }
                        gameState.board[i][j] = CONFIG.EMPTY;
                    }
                }
            }
            return null;
        }

        checkWin(x, y, player, board) {
            const directions = [
                [[1, 0], [-1, 0]],
                [[0, 1], [0, -1]],
                [[1, 1], [-1, -1]],
                [[1, -1], [-1, 1]]
            ];
            
            for (const [dir1, dir2] of directions) {
                let count = 1;
                
                for (let i = 1; i < 5; i++) {
                    const nx = x + dir1[0] * i;
                    const ny = y + dir1[1] * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (board[nx][ny] === player) count++;
                    else break;
                }
                
                for (let i = 1; i < 5; i++) {
                    const nx = x + dir2[0] * i;
                    const ny = y + dir2[1] * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (board[nx][ny] === player) count++;
                    else break;
                }
                
                if (count >= 5) return true;
            }
            
            return false;
        }
    }

    // ==========================================
    // 位置评估器 - 改进版
    // ==========================================
    class PositionEvaluator {
        constructor() {
            this.scores = {
                FIVE: 1000000,
                OPEN_FOUR: 100000,
                FOUR_OPEN: 50000,
                FOUR: 10000,
                OPEN_THREE: 5000,
                THREE_OPEN: 2500,
                THREE: 1000,
                OPEN_TWO: 500,
                TWO: 100,
                ONE: 10
            };
        }

        evaluateBoard(board, player) {
            let score = 0;
            let playerThreats = { five: 0, openFour: 0, four: 0, openThree: 0 };
            let opponentThreats = { five: 0, openFour: 0, four: 0, openThree: 0 };
            const opponent = player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI;
            
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (board[i][j] !== CONFIG.EMPTY) {
                        const isPlayer = board[i][j] === player;
                        const result = this.evaluatePosition(board, i, j, board[i][j]);
                        
                        if (isPlayer) {
                            score += result.score;
                            if (result.five) playerThreats.five++;
                            if (result.openFour) playerThreats.openFour++;
                            if (result.four) playerThreats.four++;
                            if (result.openThree) playerThreats.openThree++;
                        } else {
                            score -= result.score;
                            if (result.five) opponentThreats.five++;
                            if (result.openFour) opponentThreats.openFour++;
                            if (result.four) opponentThreats.four++;
                            if (result.openThree) opponentThreats.openThree++;
                        }
                    }
                }
            }
            
            // 检查连五（必胜）
            if (playerThreats.five > 0) return 1000000;
            if (opponentThreats.five > 0) return -1000000;
            
            // 检查活四（必攻）
            if (playerThreats.openFour > 0) score += 50000;
            if (opponentThreats.openFour > 0) score -= 50000;
            
            // 检查双三（非常危险）
            const playerDoubleThree = this.countMultipleThrees(board, player);
            const opponentDoubleThree = this.countMultipleThrees(board, opponent);
            if (playerDoubleThree >= 2) score += 30000;
            if (opponentDoubleThree >= 2) score -= 30000;
            
            // 中心位置权重
            const center = Math.floor(CONFIG.BOARD_SIZE / 2);
            for (let i = center - 3; i <= center + 3; i++) {
                for (let j = center - 3; j <= center + 3; j++) {
                    if (i >= 0 && i < CONFIG.BOARD_SIZE && j >= 0 && j < CONFIG.BOARD_SIZE) {
                        if (board[i][j] === player) {
                            score += POSITION_WEIGHTS[i][j] * 2;
                        } else if (board[i][j] === opponent) {
                            score -= POSITION_WEIGHTS[i][j] * 2;
                        }
                    }
                }
            }
            
            return score;
        }

        countMultipleThrees(board, player) {
            const checked = new Set();
            let count = 0;
            
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (board[i][j] === player) {
                        const key = `${i},${j}`;
                        if (!checked.has(key)) {
                            const result = this.evaluatePosition(board, i, j, player);
                            if (result.openThree) {
                                count++;
                                checked.add(key);
                            }
                        }
                    }
                }
            }
            return count;
        }

        evaluatePosition(board, x, y, player) {
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            
            let totalScore = 0;
            let five = false, openFour = false, four = false, openThree = false, three = false;
            let openTwo = 0, two = 0;
            const lines = [];
            
            for (const [dx, dy] of directions) {
                const lineInfo = this.analyzeLine(board, x, y, dx, dy, player);
                lines.push(lineInfo);
                
                if (lineInfo.count >= 5) {
                    five = true;
                    totalScore = this.scores.FIVE;
                    break;
                } else if (lineInfo.count === 4) {
                    if (lineInfo.openEnds === 2) {
                        openFour = true;
                        totalScore += this.scores.OPEN_FOUR;
                    } else {
                        four = true;
                        totalScore += this.scores.FOUR;
                    }
                } else if (lineInfo.count === 3) {
                    if (lineInfo.openEnds === 2) {
                        openThree = true;
                        totalScore += this.scores.OPEN_THREE;
                    } else if (lineInfo.openEnds === 1) {
                        three = true;
                        totalScore += this.scores.THREE;
                    }
                } else if (lineInfo.count === 2) {
                    if (lineInfo.openEnds === 2) openTwo++;
                    else two++;
                } else if (lineInfo.count === 1 && lineInfo.openEnds === 2) {
                    openTwo++;
                }
            }
            
            // 检测眠四冲四（非常危险）
            if (four && openThree) {
                totalScore += this.scores.FOUR_OPEN;
            }
            
            // 检测活三+眠三组合
            if (openThree && three) {
                totalScore += this.scores.THREE_OPEN;
            }
            
            // 活二加分
            totalScore += openTwo * this.scores.OPEN_TWO;
            totalScore += two * this.scores.TWO;
            
            return { score: totalScore, five, openFour, four, openThree, three };
        }

        analyzeLine(board, x, y, dx, dy, player) {
            let count = 1;
            let openEnds = 0;
            
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                if (board[nx][ny] === player) count++;
                else if (board[nx][ny] === CONFIG.EMPTY) { openEnds = 1; break; }
                else break;
            }
            
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                if (board[nx][ny] === player) count++;
                else if (board[nx][ny] === CONFIG.EMPTY) { if (openEnds === 0) openEnds = 1; else openEnds = 2; break; }
                else break;
            }
            
            return { count, openEnds };
        }
    }

    // ==========================================
    // 游戏状态管理
    // ==========================================

    // ==========================================
    // 3D渲染引擎
    // ==========================================
    class Renderer3D {
        constructor(container) {
            this.container = container;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.board = null;
            this.pieces = [];
            this.hoverPiece = null;
            this.hoverGridX = -1;
            this.hoverGridY = -1;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this.animationEnabled = true;
            
            this.init();
        }

        init() {
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a2e);
            
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera = new THREE.OrthographicCamera(
                -aspect * 10, aspect * 10, 10, -10, 0.1, 1000
            );
            this.camera.position.set(0, 20, 0);
            this.camera.lookAt(0, 0, 0);
            
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true 
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);
            
            this.setupLights();
            this.createBoard();
            this.createHoverIndicator();
            this.addEventListeners();
            this.animate();
            window.addEventListener('resize', () => this.onResize());
        }

        setupLights() {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            this.scene.add(ambientLight);
            
            const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
            mainLight.position.set(12, 15, 12);
            mainLight.castShadow = true;
            mainLight.shadow.mapSize.width = 512;
            mainLight.shadow.mapSize.height = 512;
            mainLight.shadow.camera.near = 0.5;
            mainLight.shadow.camera.far = 100;
            mainLight.shadow.camera.left = -20;
            mainLight.shadow.camera.right = 20;
            mainLight.shadow.camera.top = 20;
            mainLight.shadow.camera.bottom = -20;
            mainLight.shadow.bias = -0.001;
            mainLight.shadow.radius = 2;
            this.scene.add(mainLight);
            
            const fillLight = new THREE.DirectionalLight(0x4a4aff, 0.4);
            fillLight.position.set(-10, 10, -10);
            this.scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xff4757, 0.3);
            rimLight.position.set(0, -10, -15);
            this.scene.add(rimLight);
        }

        createBoard() {
            const boardSize = CONFIG.BOARD_SIZE + 0.4;
            const boardGeometry = new THREE.BoxGeometry(
                boardSize,
                0.6,
                boardSize
            );
            
            const boardMaterial = new THREE.MeshPhongMaterial({
                color: 0xc4a35a,
                specular: 0x8b7355,
                shininess: 30
            });
            
            this.board = new THREE.Mesh(boardGeometry, boardMaterial);
            this.board.position.y = -0.3;
            this.board.receiveShadow = true;
            this.board.castShadow = true;
            this.scene.add(this.board);
            
            this.createGrid();
            this.createBorder();
            this.createClickPlane();
        }
        
        createClickPlane() {
            const clickPlaneSize = CONFIG.BOARD_SIZE - 1;
            const clickPlaneGeometry = new THREE.PlaneGeometry(clickPlaneSize, clickPlaneSize);
            const clickPlaneMaterial = new THREE.MeshBasicMaterial({
                visible: false
            });
            this.clickPlane = new THREE.Mesh(clickPlaneGeometry, clickPlaneMaterial);
            this.clickPlane.rotation.x = -Math.PI / 2;
            this.clickPlane.position.y = 0.01;
            this.scene.add(this.clickPlane);
        }

        createGrid() {
            const gridMaterial = new THREE.LineBasicMaterial({ 
                color: 0x4a3728,
                transparent: false,
                opacity: 1
            });
            
            const gridGeometry = new THREE.BufferGeometry();
            const positions = [];
            
            const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2);
            
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                const x = i - centerIndex;
                positions.push(x, 0.02, -centerIndex);
                positions.push(x, 0.02, centerIndex);
            }
            
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                const z = i - centerIndex;
                positions.push(-centerIndex, 0.02, z);
                positions.push(centerIndex, 0.02, z);
            }
            
            gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
            this.scene.add(grid);
            
            this.createStarPoints();
        }

        createStarPoints() {
            const starPoints = [
                [3, 3], [3, 7], [3, 11],
                [7, 3], [7, 7], [7, 11],
                [11, 3], [11, 7], [11, 11]
            ];
            
            const starGeometry = new THREE.CircleGeometry(0.12, 32);
            const starMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                opacity: 1
            });
            
            const halfSize = CONFIG.BOARD_SIZE / 2;
            
            for (const [x, y] of starPoints) {
                const star = new THREE.Mesh(starGeometry, starMaterial);
                star.rotation.x = -Math.PI / 2;
                const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2);
                star.position.set(
                    x - centerIndex,
                    0.03,
                    y - centerIndex
                );
                this.scene.add(star);
            }
        }

        createBorder() {
            const boardSize = CONFIG.BOARD_SIZE + 0.8;
            const borderGeometry = new THREE.BoxGeometry(
                boardSize,
                0.8,
                boardSize
            );
            
            const borderMaterial = new THREE.MeshPhongMaterial({
                color: 0x5c4033,
                specular: 0x8b7355,
                shininess: 25
            });
            
            const border = new THREE.Mesh(borderGeometry, borderMaterial);
            border.position.y = -0.4;
            border.receiveShadow = true;
            border.castShadow = true;
            this.scene.add(border);
        }

        createHoverIndicator() {
            const geometry = new THREE.RingGeometry(0.35, 0.42, 32);
            const material = new THREE.MeshBasicMaterial({
                color: 0x4a4aff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            
            this.hoverPiece = new THREE.Mesh(geometry, material);
            this.hoverPiece.rotation.x = -Math.PI / 2;
            this.hoverPiece.position.y = 0.06;
            this.hoverPiece.visible = false;
            this.scene.add(this.hoverPiece);
        }

        addPiece(x, y, player, animate = true) {
            const color = player === CONFIG.PLAYER_HUMAN ? 0x4a4aff : 0xff4757;
            const emissiveColor = player === CONFIG.PLAYER_HUMAN ? 0x2a2aff : 0xff2030;
            
            const pieceGeometry = new THREE.SphereGeometry(0.5, 32, 32);
            const pieceMaterial = new THREE.MeshPhongMaterial({
                color: color,
                emissive: emissiveColor,
                emissiveIntensity: 0.3,
                shininess: 100,
                specular: 0xffffff
            });
            
            const piece = new THREE.Mesh(pieceGeometry, pieceMaterial);
            piece.castShadow = true;
            piece.receiveShadow = true;
            
            const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2);
            const boardX = x - centerIndex;
            const boardZ = y - centerIndex;
            const pieceHeight = 0.5;
            
            if (animate && this.animationEnabled) {
                piece.position.set(boardX, 8, boardZ);
                piece.scale.set(0.1, 0.1, 0.1);
                
                new TWEEN.Tween(piece.position)
                    .to({ y: pieceHeight }, CONFIG.ANIMATION_SPEED)
                    .easing(TWEEN.Easing.Bounce.Out)
                    .start();
                
                new TWEEN.Tween(piece.scale)
                    .to({ x: 1, y: 1, z: 1 }, CONFIG.ANIMATION_SPEED)
                    .easing(TWEEN.Easing.Elastic.Out)
                    .start();
            } else {
                piece.position.set(boardX, pieceHeight, boardZ);
            }
            
            piece.userData = { x, y, player };
            this.scene.add(piece);
            this.pieces.push(piece);
            
            return piece;
        }

        removeLastPiece() {
            if (this.pieces.length > 0) {
                const piece = this.pieces.pop();
                this.scene.remove(piece);
                return { x: piece.userData.x, y: piece.userData.y };
            }
            return null;
        }

        clearPieces() {
            for (const piece of this.pieces) {
                this.scene.remove(piece);
            }
            this.pieces = [];
            this.hoverGridX = -1;
            this.hoverGridY = -1;
        }

        addEventListeners() {
            this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
            this.container.addEventListener('click', (e) => this.onClick(e));
            this.container.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        onMouseMove(event) {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const intersects = this.raycaster.intersectObject(this.clickPlane);
            
            if (intersects.length > 0) {
                const point = intersects[0].point;
                const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2);
                const gridX = Math.floor(point.x + centerIndex);
                const gridY = Math.floor(point.z + centerIndex);
                
                if (gridX === this.hoverGridX && gridY === this.hoverGridY) {
                    return;
                }
                this.hoverGridX = gridX;
                this.hoverGridY = gridY;
                
                if (gridX >= 0 && gridX < CONFIG.BOARD_SIZE && 
                    gridY >= 0 && gridY < CONFIG.BOARD_SIZE &&
                    gameState.board[gridX][gridY] === CONFIG.EMPTY &&
                    gameState.currentPlayer === CONFIG.PLAYER_HUMAN &&
                    gameState.isPlaying &&
                    !gameState.gameOver) {
                    
                    this.hoverPiece.position.x = gridX - centerIndex;
                    this.hoverPiece.position.z = gridY - centerIndex;
                    this.hoverPiece.visible = true;
                } else {
                    this.hoverPiece.visible = false;
                }
            } else {
                this.hoverGridX = -1;
                this.hoverGridY = -1;
                this.hoverPiece.visible = false;
            }
        }

        onClick(event) {
            if (!gameState.isPlaying || gameState.gameOver) return;
            if (gameState.currentPlayer !== CONFIG.PLAYER_HUMAN) return;
            
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const intersects = this.raycaster.intersectObject(this.clickPlane);
            
            if (intersects.length > 0) {
                const point = intersects[0].point;
                const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2);
                const gridX = Math.floor(point.x + centerIndex);
                const gridY = Math.floor(point.z + centerIndex);
                
                if (gridX >= 0 && gridX < CONFIG.BOARD_SIZE && 
                    gridY >= 0 && gridY < CONFIG.BOARD_SIZE) {
                    onHumanMove(gridX, gridY);
                }
            }
        }

        onResize() {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            
            const aspect = width / height;
            this.camera.left = -aspect * 10;
            this.camera.right = aspect * 10;
            this.camera.top = 10;
            this.camera.bottom = -10;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(width, height);
        }

        animate(time) {
            requestAnimationFrame((t) => this.animate(t));
            TWEEN.update(time);
            this.renderer.render(this.scene, this.camera);
        }

        setAnimationEnabled(enabled) {
            this.animationEnabled = enabled;
        }
    }

    // ==========================================
    // 音效管理器
    // ==========================================
    class SoundManager {
        constructor() {
            this.enabled = true;
            this.sounds = {};
            this.init();
        }

        init() {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        playPlace() {
            if (!this.enabled) return;
            this.playTone(800, 0.1, 'sine');
        }

        playWin() {
            if (!this.enabled) return;
            this.playTone(523, 0.2, 'sine');
            setTimeout(() => this.playTone(659, 0.2, 'sine'), 150);
            setTimeout(() => this.playTone(784, 0.3, 'sine'), 300);
        }

        playLose() {
            if (!this.enabled) return;
            this.playTone(400, 0.3, 'sine');
            setTimeout(() => this.playTone(350, 0.3, 'sine'), 200);
            setTimeout(() => this.playTone(300, 0.4, 'sine'), 400);
        }

        playClick() {
            if (!this.enabled) return;
            this.playTone(600, 0.05, 'square');
        }

        playTone(frequency, duration, type) {
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + duration);
            } catch (e) {
                console.log('Audio not supported');
            }
        }

        setEnabled(enabled) {
            this.enabled = enabled;
        }
    }

    // ==========================================
    // 存储管理器
    // ==========================================
    class StorageManager {
        constructor() {
            this.storageKey = 'gomoku_game_records';
            this.statsKey = 'gomoku_game_stats';
        }

        saveGame(gameRecord) {
            const records = this.getRecords();
            records.unshift(gameRecord);
            if (records.length > 100) {
                records.pop();
            }
            localStorage.setItem(this.storageKey, JSON.stringify(records));
        }

        getRecords() {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        }

        clearRecords() {
            localStorage.removeItem(this.storageKey);
        }

        getStats() {
            const data = localStorage.getItem(this.statsKey);
            return data ? JSON.parse(data) : {
                totalGames: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                bestTime: null
            };
        }

        updateStats(result, duration) {
            const stats = this.getStats();
            stats.totalGames++;
            
            if (result === 'win') stats.wins++;
            else if (result === 'lose') stats.losses++;
            else stats.draws++;
            
            if (result === 'win' && (stats.bestTime === null || duration < stats.bestTime)) {
                stats.bestTime = duration;
            }
            
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
            return stats;
        }

        exportRecords() {
            const records = this.getRecords();
            const dataStr = JSON.stringify(records, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `gomoku_records_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
        }
    }

    // ==========================================
    // 全局变量和初始化
    // ==========================================
    let gameState;
    let ai;
    let renderer;
    let soundManager;
    let storageManager;
    let gameCanvas;

    function init() {
        gameCanvas = document.getElementById('gameCanvas');
        gameState = new GameState();
        ai = new AI('medium');
        soundManager = new SoundManager();
        storageManager = new StorageManager();
        renderer = new Renderer3D(gameCanvas);
        
        setupEventListeners();
        updateUI();
        loadStats();
    }

    function setupEventListeners() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                gameState.difficulty = btn.dataset.difficulty;
                ai.setDifficulty(btn.dataset.difficulty);
                soundManager.playClick();
            });
        });
        
        document.getElementById('startGame').addEventListener('click', startGame);
        document.getElementById('restartGameLeft').addEventListener('click', restartGame);
        document.getElementById('undoMove').addEventListener('click', undoMove);
        document.getElementById('saveGame').addEventListener('click', saveGame);
        
        document.getElementById('pauseTimer').addEventListener('click', togglePause);
        document.getElementById('resetTimer').addEventListener('click', resetTimers);
        
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            soundManager.setEnabled(e.target.checked);
        });
        
        document.getElementById('animationToggle').addEventListener('change', (e) => {
            renderer.setAnimationEnabled(e.target.checked);
        });
        
        document.getElementById('loadHistory').addEventListener('click', loadHistory);
        document.getElementById('exportHistory').addEventListener('click', exportHistory);
        document.getElementById('clearHistory').addEventListener('click', clearHistory);
        
        document.getElementById('playAgain').addEventListener('click', () => {
            closeModal();
            restartGame();
        });
        document.getElementById('closeModal').addEventListener('click', closeModal);
    }

    function startGame() {
        gameState.reset();
        gameState.isPlaying = true;
        gameState.difficulty = ai.difficulty;
        
        renderer.clearPieces();
        
        document.getElementById('gameOverlay').classList.add('hidden');
        document.getElementById('gameOverHint').style.display = 'none';
        updateGameMessage('游戏进行中...', 'info');
        
        gameState.startTimer();
        updateUI();
        
        soundManager.playClick();
    }

    function restartGame() {
        gameState.reset();
        gameState.difficulty = ai.difficulty;
        
        renderer.clearPieces();
        
        document.getElementById('gameOverlay').classList.remove('hidden');
        document.getElementById('gameOverHint').style.display = 'none';
        updateGameMessage('选择难度后点击"开始游戏"', 'info');
        
        updateUI();
        soundManager.playClick();
    }

    function undoMove() {
        if (!gameState.isPlaying || gameState.moves.length < 2) return;
        
        renderer.removeLastPiece();
        gameState.undoMove();
        
        renderer.removeLastPiece();
        gameState.undoMove();
        
        soundManager.playClick();
        updateUI();
    }

    function saveGame() {
        if (!gameState.isPlaying || gameState.moves.length === 0) {
            updateGameMessage('没有可保存的游戏', 'warning');
            return;
        }
        
        storageManager.saveGame(gameState.gameRecord);
        updateGameMessage('游戏已保存', 'success');
        loadHistoryList();
        soundManager.playClick();
    }

    function onHumanMove(x, y) {
        if (!gameState.makeMove(x, y)) return;
        
        soundManager.playPlace();
        renderer.addPiece(x, y, CONFIG.PLAYER_HUMAN);
        
        updateUI();
        
        if (gameState.gameOver) {
            onGameOver();
            return;
        }
        
        updateAIStatus('思考中...');
        
        const difficulty = gameState.difficulty;
        const thinkTime = CONFIG.AI_THINK_TIME[difficulty];
        
        setTimeout(() => {
            const aiMove = ai.getBestMove(gameState);
            
            if (aiMove) {
                gameState.makeMove(aiMove.x, aiMove.y);
                soundManager.playPlace();
                renderer.addPiece(aiMove.x, aiMove.y, CONFIG.PLAYER_AI);
                
                updateUI();
                
                if (gameState.gameOver) {
                    onGameOver();
                } else {
                    updateAIStatus('待机');
                }
            }
        }, thinkTime);
    }

    function onGameOver() {
        gameState.stopTimer();
        
        const modal = document.getElementById('winModal');
        const winnerInfo = document.getElementById('winnerInfo');
        
        try {
            if (gameState.winner === CONFIG.PLAYER_HUMAN) {
                winnerInfo.innerHTML = '<i class="fas fa-trophy"></i> 恭喜！你赢了！';
                winnerInfo.className = 'winner-info player-win';
                soundManager.playWin();
            } else if (gameState.winner === CONFIG.PLAYER_AI) {
                winnerInfo.innerHTML = '<i class="fas fa-robot"></i> AI获胜！';
                winnerInfo.className = 'winner-info ai-win';
                soundManager.playLose();
            } else {
                winnerInfo.innerHTML = '<i class="fas fa-handshake"></i> 平局！';
                winnerInfo.className = 'winner-info draw';
            }
        } catch (e) {
            console.warn('Sound error:', e);
        }
        
        document.getElementById('totalMoves').textContent = gameState.moves.length;
        document.getElementById('gameDuration').textContent = formatTime(gameState.totalTime);
        document.getElementById('gameDifficulty').textContent = getDifficultyName(gameState.difficulty);
        
        const stats = storageManager.updateStats(gameState.gameRecord.result, gameState.totalTime);
        updateStatsDisplay(stats);
        
        storageManager.saveGame(gameState.gameRecord);
        loadHistoryList();
        
        document.getElementById('gameOverHint').style.display = 'block';
        
        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('winModal').classList.remove('active');
    }

    function togglePause() {
        if (gameState.isPaused) {
            gameState.resume();
            document.getElementById('pauseTimer').innerHTML = '<i class="fas fa-pause"></i> 暂停';
        } else {
            gameState.pause();
            document.getElementById('pauseTimer').innerHTML = '<i class="fas fa-play"></i> 继续';
        }
        soundManager.playClick();
    }

    function resetTimers() {
        gameState.totalTime = 0;
        gameState.currentStepTime = 0;
        updateTimerDisplay();
        soundManager.playClick();
    }

    function updateTimerDisplay() {
        document.getElementById('currentStepTimer').textContent = formatTime(gameState.currentStepTime);
        document.getElementById('totalTimer').textContent = formatTime(gameState.totalTime);
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateUI() {
        updateTurnIndicator();
        updatePlayerInfo();
        updateTimerDisplay();
        updateUndoButton();
    }

    function updateUndoButton() {
        const undoBtn = document.getElementById('undoMove');
        if (gameState.isPlaying && gameState.moves.length >= 2) {
            undoBtn.disabled = false;
        } else {
            undoBtn.disabled = true;
        }
    }

    function updateTurnIndicator() {
        const indicator = document.getElementById('turnIndicator');
        const icon = indicator.querySelector('.player-icon');
        const text = indicator.querySelector('.turn-text');
        
        if (gameState.currentPlayer === CONFIG.PLAYER_HUMAN) {
            indicator.className = 'turn-indicator';
            icon.className = 'player-icon player-human';
            icon.innerHTML = '<i class="fas fa-user"></i>';
            text.textContent = '你的回合';
        } else {
            indicator.className = 'turn-indicator ai-turn';
            icon.className = 'player-icon player-ai';
            icon.innerHTML = '<i class="fas fa-robot"></i>';
            text.textContent = 'AI思考中...';
        }
    }

    function updatePlayerInfo() {
        const humanPlayer = document.querySelector('.human-player');
        const aiPlayer = document.querySelector('.ai-player');
        
        if (gameState.currentPlayer === CONFIG.PLAYER_HUMAN) {
            humanPlayer.classList.add('active');
            aiPlayer.classList.remove('active');
        } else {
            humanPlayer.classList.remove('active');
            aiPlayer.classList.add('active');
        }
    }

    function updateGameMessage(message, type = 'info') {
        const messageEl = document.getElementById('gameMessage');
        const content = messageEl.querySelector('.message-content');
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'error') icon = 'times-circle';
        
        content.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
    }

    function updateAIStatus(status) {
        document.getElementById('aiStatus').innerHTML = `<i class="fas fa-robot"></i> AI: ${status}`;
    }

    function getDifficultyName(difficulty) {
        const names = { easy: '简单', medium: '中等', hard: '困难' };
        return names[difficulty] || '中等';
    }

    function loadStats() {
        const stats = storageManager.getStats();
        updateStatsDisplay(stats);
    }

    function updateStatsDisplay(stats) {
        document.getElementById('totalGames').textContent = stats.totalGames;
        
        const winRate = stats.totalGames > 0 ? 
            Math.round((stats.wins / stats.totalGames) * 100) : 0;
        document.getElementById('winRate').textContent = winRate + '%';
        
        document.getElementById('bestTime').textContent = stats.bestTime ? 
            formatTime(stats.bestTime) : '--:--';
    }

    function loadHistoryList() {
        const historyList = document.getElementById('historyList');
        const records = storageManager.getRecords();
        
        if (records.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-inbox"></i>
                    <p>暂无游戏记录</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = records.slice(0, 10).map((record, index) => {
            const date = new Date(record.startTime).toLocaleDateString();
            const resultText = { win: '胜利', lose: '失败', draw: '平局' };
            const resultClass = record.result;
            
            return `
                <div class="history-item" data-index="${index}">
                    <span class="date">${date}</span>
                    <span class="result ${resultClass}">${resultText[record.result]}</span>
                </div>
            `;
        }).join('');
    }

    function loadHistory() {
        loadHistoryList();
        updateGameMessage('已加载游戏记录', 'info');
        soundManager.playClick();
    }

    function exportHistory() {
        storageManager.exportRecords();
        updateGameMessage('已导出游戏记录', 'success');
        soundManager.playClick();
    }

    function clearHistory() {
        if (confirm('确定要清空所有游戏记录吗？')) {
            storageManager.clearRecords();
            loadHistoryList();
            updateGameMessage('已清空游戏记录', 'info');
            soundManager.playClick();
        }
    }

    window.addEventListener('DOMContentLoaded', init);
    
    let frameCount = 0;
    let lastFpsUpdate = Date.now();
    
    setInterval(() => {
        const now = Date.now();
        const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
        document.getElementById('fpsCounter').innerHTML = 
            `<i class="fas fa-tachometer-alt"></i> FPS: ${fps}`;
        frameCount = 0;
        lastFpsUpdate = now;
    }, 1000);
    
    function countFrame() {
        frameCount++;
        requestAnimationFrame(countFrame);
    }
    countFrame();

})();

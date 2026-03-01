// ============================================
// 3D五子棋游戏 - 主逻辑文件
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
            
            // 计时器
            this.totalTime = 0;
            this.currentStepTime = 0;
            this.timerInterval = null;
            this.lastMoveTime = Date.now();
            
            // 游戏记录
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
            
            // 检查胜利
            if (this.checkWin(x, y)) {
                this.gameOver = true;
                this.winner = this.currentPlayer;
                this.gameRecord.result = this.currentPlayer === CONFIG.PLAYER_HUMAN ? 'win' : 'lose';
                this.gameRecord.duration = this.totalTime;
                this.stopTimer();
                return true;
            }

            // 检查平局
            if (this.moves.length === CONFIG.BOARD_SIZE * CONFIG.BOARD_SIZE) {
                this.gameOver = true;
                this.winner = null;
                this.gameRecord.result = 'draw';
                this.gameRecord.duration = this.totalTime;
                this.stopTimer();
                return true;
            }

            // 切换玩家
            this.currentPlayer = this.currentPlayer === CONFIG.PLAYER_HUMAN ? 
                CONFIG.PLAYER_AI : CONFIG.PLAYER_HUMAN;
            this.currentStepTime = 0;
            this.lastMoveTime = Date.now();
            
            return true;
        }

        checkWin(x, y) {
            const player = this.board[x][y];
            const directions = [
                [[1, 0], [-1, 0]],  // 水平
                [[0, 1], [0, -1]],  // 垂直
                [[1, 1], [-1, -1]], // 对角线
                [[1, -1], [-1, 1]]  // 反对角线
            ];

            for (const [dir1, dir2] of directions) {
                let count = 1;
                count += this.countDirection(x, y, player, dir1);
                count += this.countDirection(x, y, player, dir2);
                
                if (count >= CONFIG.WIN_LENGTH) {
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
    // AI算法
    // ==========================================
    class AI {
        constructor(difficulty = 'medium') {
            this.difficulty = difficulty;
            this.evaluator = new PositionEvaluator();
            this.tt = new Map();
            this.maxTime = 3000;
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

        getBestMove(gameState) {
            this.tt.clear();
            const moveCount = this.countPieces(gameState.board);
            
            // 开局：优先占据中心
            if (moveCount < 2) {
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
            // 中心点
            if (gameState.board[center][center] === CONFIG.EMPTY) {
                return { x: center, y: center };
            }
            // 周围的星位点
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
            // 1. 检查是否能直接获胜
            const winMove = this.findWinningMove(gameState, CONFIG.PLAYER_AI);
            if (winMove) return winMove;
            
            // 2. 检查是否需要防守玩家的获胜
            const blockMove = this.findWinningMove(gameState, CONFIG.PLAYER_HUMAN);
            if (blockMove) return blockMove;
            
            // 3. 检查双三威胁（必须防守）
            const doubleThreeBlock = this.findDoubleThreeBlock(gameState);
            if (doubleThreeBlock) return doubleThreeBlock;
            
            // 4. 评估所有候选走法
            const moves = this.getValidMoves(gameState, 5);
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            // 快速评估
            this.sortMovesByThreat(gameState, moves, CONFIG.PLAYER_AI);
            
            let bestScore = -Infinity;
            let bestMove = moves[0];
            
            for (const move of moves.slice(0, 20)) {
                const score = this.evaluateMove(gameState, move.x, move.y, CONFIG.PLAYER_AI);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            
            return bestMove;
        }

        getHardMove(gameState) {
            const startTime = Date.now();
            
            // 1. 检查是否能直接获胜
            const winMove = this.findWinningMove(gameState, CONFIG.PLAYER_AI);
            if (winMove) return winMove;
            
            // 2. 检查是否需要防守玩家的获胜
            const blockMove = this.findWinningMove(gameState, CONFIG.PLAYER_HUMAN);
            if (blockMove) return blockMove;
            
            // 3. 检查双三威胁（必须防守）
            const doubleThreeBlock = this.findDoubleThreeBlock(gameState);
            if (doubleThreeBlock) return doubleThreeBlock;
            
            // 4. 使用迭代加深的Alpha-Beta搜索
            let bestMove = null;
            let bestScore = -Infinity;
            
            // 首先获取候选走法
            let moves = this.getValidMoves(gameState, 5);
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            // 走法排序
            this.sortMovesByThreat(gameState, moves, CONFIG.PLAYER_AI);
            
            // 迭代加深搜索
            for (let depth = 2; depth <= 5; depth++) {
                if (Date.now() - startTime > this.maxTime) break;
                
                let alpha = -Infinity;
                let beta = Infinity;
                let currentBest = null;
                
                for (const move of moves) {
                    if (Date.now() - startTime > this.maxTime) break;
                    
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                    
                    // 检查获胜
                    if (this.checkWin(move.x, move.y, CONFIG.PLAYER_AI, gameState.board)) {
                        gameState.board[move.x][move.y] = CONFIG.EMPTY;
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

        negamax(gameState, depth, alpha, beta, player, startTime) {
            if (Date.now() - startTime > this.maxTime) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }
            
            if (depth === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            const moves = this.getValidMoves(gameState, 4);
            if (moves.length === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            this.sortMovesByThreat(gameState, moves, player);
            
            let maxScore = -Infinity;
            
            for (const move of moves.slice(0, 15)) {
                if (Date.now() - startTime > this.maxTime) break;
                
                gameState.board[move.x][move.y] = player;
                
                // 检查获胜
                if (this.checkWin(move.x, move.y, player, gameState.board)) {
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    return 100000 * player;
                }
                
                const score = -this.negamax(gameState, depth - 1, -beta, -alpha, 
                    player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI, startTime);
                
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                if (score > maxScore) {
                    maxScore = score;
                }
                
                if (maxScore > alpha) {
                    alpha = maxScore;
                }
                
                if (alpha >= beta) break;
            }
            
            return maxScore;
        }

        findDoubleThreeBlock(gameState) {
            // 寻找能形成双三的位置并防守
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        // 假设玩家下在这里
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
                
                // 进攻评估
                gameState.board[move.x][move.y] = player;
                const attackThreats = this.countThreats(gameState.board, move.x, move.y, player);
                if (attackThreats.four >= 1) priority += 50000;
                else if (attackThreats.openThree >= 1) priority += 5000;
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                // 防守评估
                gameState.board[move.x][move.y] = opponent;
                const defendThreats = this.countThreats(gameState.board, move.x, move.y, opponent);
                if (defendThreats.four >= 1) priority += 40000;
                else if (defendThreats.openThree >= 1) priority += 4000;
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                // 距离中心的距离（越近越有价值）
                const center = CONFIG.BOARD_SIZE / 2;
                const dist = Math.abs(move.x - center) + Math.abs(move.y - center);
                priority += (14 - dist) * 10;
                
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
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            
            for (const [dx, dy] of directions) {
                let count = 1;
                
                for (let i = 1; i < 5; i++) {
                    const nx = x + dx * i;
                    const ny = y + dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (board[nx][ny] === player) count++;
                    else break;
                }
                
                for (let i = 1; i < 5; i++) {
                    const nx = x - dx * i;
                    const ny = y - dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (board[nx][ny] === player) count++;
                    else break;
                }
                
                if (count >= 5) return true;
            }
            
            return false;
        }

        setDifficulty(difficulty) {
            this.difficulty = difficulty;
        }

        getBestMove(gameState) {
            this.tt.clear(); // 清空转置表
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
            // 改进：先检查是否能直接获胜
            const winMove = this.findWinningMove(gameState, CONFIG.PLAYER_AI);
            if (winMove) return winMove;
            
            // 检查是否需要防守玩家的获胜
            const blockMove = this.findWinningMove(gameState, CONFIG.PLAYER_HUMAN);
            if (blockMove) return blockMove;
            
            const moves = this.getValidMoves(gameState, 4);
            
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            let bestScore = -Infinity;
            let bestMove = moves[0];
            
            for (const move of moves) {
                const score = this.evaluateMove(gameState, move.x, move.y, CONFIG.PLAYER_AI);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            
            return bestMove;
        }

        getHardMove(gameState) {
            // 改进：先检查是否能直接获胜
            const winMove = this.findWinningMove(gameState, CONFIG.PLAYER_AI);
            if (winMove) return winMove;
            
            // 检查是否需要防守玩家的获胜
            const blockMove = this.findWinningMove(gameState, CONFIG.PLAYER_HUMAN);
            if (blockMove) return blockMove;
            
            const moves = this.getValidMoves(gameState, 5);
            
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            let bestScore = -Infinity;
            let bestMove = moves[0];
            
            // 使用Minimax算法，深度增加到4
            for (const move of moves) {
                gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                
                const score = this.minimax(gameState, 3, -Infinity, Infinity, false, 4);
                
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            
            return bestMove;
        }

        minimax(gameState, depth, alpha, beta, isMaximizing, maxDepth) {
            if (depth === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            const moves = this.getValidMoves(gameState, 4);
            
            if (moves.length === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            // 根据威胁程度排序走法
            this.sortMoves(gameState, moves, isMaximizing ? CONFIG.PLAYER_AI : CONFIG.PLAYER_HUMAN);

            if (isMaximizing) {
                let maxEval = -Infinity;
                for (const move of moves) {
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                    
                    if (this.checkWinningMove(move.x, move.y, CONFIG.PLAYER_AI)) {
                        gameState.board[move.x][move.y] = CONFIG.EMPTY;
                        return 100000 + depth * 1000; // 快速获胜更优
                    }
                    
                    const evalScore = this.minimax(gameState, depth - 1, alpha, beta, false, maxDepth);
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    
                    maxEval = Math.max(maxEval, evalScore);
                    alpha = Math.max(alpha, evalScore);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const move of moves) {
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_HUMAN;
                    
                    if (this.checkWinningMove(move.x, move.y, CONFIG.PLAYER_HUMAN)) {
                        gameState.board[move.x][move.y] = CONFIG.EMPTY;
                        return -100000 - depth * 1000; // 快速输棋更糟
                    }
                    
                    const evalScore = this.minimax(gameState, depth - 1, alpha, beta, true, maxDepth);
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    
                    minEval = Math.min(minEval, evalScore);
                    beta = Math.min(beta, evalScore);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        sortMoves(gameState, moves, player) {
            // 根据威胁程度排序
            for (const move of moves) {
                let priority = 0;
                
                // 检查是否能形成活四或冲四（进攻）
                gameState.board[move.x][move.y] = player;
                if (this.countFourInRow(gameState.board, move.x, move.y, player) >= 1) {
                    priority += 10000;
                }
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                // 检查是否能形成活三（进攻）
                gameState.board[move.x][move.y] = player;
                if (this.countThreeInRow(gameState.board, move.x, move.y, player) >= 1) {
                    priority += 1000;
                }
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                // 检查是否能形成活三或冲四（防守）
                const opponent = player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI;
                gameState.board[move.x][move.y] = opponent;
                if (this.countThreeInRow(gameState.board, move.x, move.y, opponent) >= 1) {
                    priority += 500;
                }
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                move.priority = priority;
            }
            
            moves.sort((a, b) => b.priority - a.priority);
        }

        countFourInRow(board, x, y, player) {
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let count = 0;
            
            for (const [dx, dy] of directions) {
                let lineLength = 1;
                
                for (let i = 1; i < 5; i++) {
                    const nx = x + dx * i;
                    const ny = y + dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (board[nx][ny] === player) lineLength++;
                    else break;
                }
                
                for (let i = 1; i < 5; i++) {
                    const nx = x - dx * i;
                    const ny = y - dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (board[nx][ny] === player) lineLength++;
                    else break;
                }
                
                if (lineLength >= 4) count++;
            }
            
            return count;
        }

        countThreeInRow(board, x, y, player) {
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let count = 0;
            
            for (const [dx, dy] of directions) {
                let line = '';
                
                for (let i = -4; i <= 4; i++) {
                    const nx = x + dx * i;
                    const ny = y + dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) {
                        line += '0';
                    } else if (board[nx][ny] === player) {
                        line += '1';
                    } else if (board[nx][ny] === CONFIG.EMPTY) {
                        line += '0';
                    } else {
                        line += '2';
                    }
                }
                
                // 检查活三模式
                if (line.includes('01110') || line.includes('11010') || 
                    line.includes('10110') || line.includes('01011') || line.includes('11001')) {
                    count++;
                }
            }
            
            return count;
        }

        getValidMoves(gameState, range) {
            const moves = [];
            const checked = new Set();
            
            // 改进：扩大搜索范围，考虑更远的位置
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
            
            // 改进：限制搜索位置数量，但保留更多候选
            return moves.slice(0, 40);
        }

        evaluateMove(gameState, x, y, player) {
            gameState.board[x][y] = player;
            const score = this.evaluator.evaluateBoard(gameState.board, player);
            gameState.board[x][y] = CONFIG.EMPTY;
            return score;
        }

        findWinningMove(gameState, player) {
            // 改进：寻找能直接获胜的走法
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (gameState.board[i][j] === CONFIG.EMPTY) {
                        gameState.board[i][j] = player;
                        if (this.checkWinningMove(i, j, player)) {
                            gameState.board[i][j] = CONFIG.EMPTY;
                            return { x: i, y: j };
                        }
                        gameState.board[i][j] = CONFIG.EMPTY;
                    }
                }
            }
            return null;
        }

        checkWinningMove(x, y, player) {
            const directions = [
                [1, 0], [0, 1], [1, 1], [1, -1]
            ];
            
            for (const [dx, dy] of directions) {
                let count = 1;
                
                for (let i = 1; i < 5; i++) {
                    const nx = x + dx * i;
                    const ny = y + dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (gameState.board[nx][ny] === player) count++;
                    else break;
                }
                
                for (let i = 1; i < 5; i++) {
                    const nx = x - dx * i;
                    const ny = y - dy * i;
                    if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) break;
                    if (gameState.board[nx][ny] === player) count++;
                    else break;
                }
                
                if (count >= 5) return true;
            }
            
            return false;
        }

        setDifficulty(difficulty) {
            this.difficulty = difficulty;
        }

        getBestMove(gameState) {
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
            const moves = this.getValidMoves(gameState, 3);
            
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            // 评估每个位置
            let bestScore = -Infinity;
            let bestMove = moves[0];
            
            for (const move of moves) {
                const score = this.evaluateMove(gameState, move.x, move.y, CONFIG.PLAYER_AI);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            
            return bestMove;
        }

        getHardMove(gameState) {
            const moves = this.getValidMoves(gameState, 4);
            
            if (moves.length === 0) return this.getRandomMove(gameState);
            
            let bestScore = -Infinity;
            let bestMove = moves[0];
            
            // 使用Minimax算法，深度为3
            for (const move of moves) {
                gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                
                const score = this.minimax(gameState, 2, -Infinity, Infinity, false);
                
                gameState.board[move.x][move.y] = CONFIG.EMPTY;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            
            return bestMove;
        }

        minimax(gameState, depth, alpha, beta, isMaximizing) {
            if (depth === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            const moves = this.getValidMoves(gameState, 3);
            
            if (moves.length === 0) {
                return this.evaluator.evaluateBoard(gameState.board, CONFIG.PLAYER_AI);
            }

            if (isMaximizing) {
                let maxEval = -Infinity;
                for (const move of moves) {
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_AI;
                    
                    if (this.checkWinningMove(move.x, move.y, CONFIG.PLAYER_AI)) {
                        gameState.board[move.x][move.y] = CONFIG.EMPTY;
                        return 100000;
                    }
                    
                    const evalScore = this.minimax(gameState, depth - 1, alpha, beta, false);
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    
                    maxEval = Math.max(maxEval, evalScore);
                    alpha = Math.max(alpha, evalScore);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const move of moves) {
                    gameState.board[move.x][move.y] = CONFIG.PLAYER_HUMAN;
                    
                    if (this.checkWinningMove(move.x, move.y, CONFIG.PLAYER_HUMAN)) {
                        gameState.board[move.x][move.y] = CONFIG.EMPTY;
                        return -100000;
                    }
                    
                    const evalScore = this.minimax(gameState, depth - 1, alpha, beta, true);
                    gameState.board[move.x][move.y] = CONFIG.EMPTY;
                    
                    minEval = Math.min(minEval, evalScore);
                    beta = Math.min(beta, evalScore);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        getValidMoves(gameState, range) {
            const moves = [];
            const checked = new Set();
            
            // 只考虑已有棋子周围的位置
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
            
            // 如果棋盘为空，返回中心位置
            if (moves.length === 0) {
                const center = Math.floor(CONFIG.BOARD_SIZE / 2);
                return [{ x: center, y: center }];
            }
            
            return moves;
        }

        evaluateMove(gameState, x, y, player) {
            gameState.board[x][y] = player;
            const score = this.evaluator.evaluatePosition(gameState.board, x, y, player);
            gameState.board[x][y] = CONFIG.EMPTY;
            return score;
        }

        checkWinningMove(x, y, player) {
            const directions = [
                [[1, 0], [-1, 0]],
                [[0, 1], [0, -1]],
                [[1, 1], [-1, -1]],
                [[1, -1], [-1, 1]]
            ];

            for (const [dir1, dir2] of directions) {
                let count = 1;
                count += this.countDir(x, y, player, dir1);
                count += this.countDir(x, y, player, dir2);
                if (count >= 5) return true;
            }
            return false;
        }

        countDir(x, y, player, dir) {
            let count = 0;
            let dx = dir[0], dy = dir[1];
            let nx = x + dx, ny = y + dy;
            
            while (nx >= 0 && nx < CONFIG.BOARD_SIZE && 
                   ny >= 0 && ny < CONFIG.BOARD_SIZE && 
                   gameState.board[nx][ny] === player) {
                count++;
                nx += dx;
                ny += dy;
            }
            return count;
        }
    }

    // ==========================================
    // 位置评估器
    // ==========================================
    class PositionEvaluator {
        constructor() {
            // 棋型分数表 - 改进：更细致的评估
            this.scores = {
                // 连五（必胜）
                FIVE: 100000,
                // 活四（必胜）
                OPEN_FOUR: 10000,
                // 冲四（对手无法同时防守）
                FOUR: 1000,
                // 活三（重要进攻棋型）
                OPEN_THREE: 500,
                // 眠三
                THREE: 100,
                // 活二
                OPEN_TWO: 50,
                // 眠二
                TWO: 10
            };
        }

        evaluateBoard(board, player) {
            let score = 0;
            const opponent = player === CONFIG.PLAYER_AI ? CONFIG.PLAYER_HUMAN : CONFIG.PLAYER_AI;
            
            // 评估所有位置
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
                    if (board[i][j] !== CONFIG.EMPTY) {
                        const isPlayer = board[i][j] === player;
                        const baseScore = this.evaluatePosition(board, i, j, board[i][j]);
                        
                        if (isPlayer) {
                            score += baseScore;
                        } else {
                            score -= baseScore;
                        }
                    }
                }
            }
            
            // 改进：考虑中心位置的价值
            const center = Math.floor(CONFIG.BOARD_SIZE / 2);
            for (let i = center - 2; i <= center + 2; i++) {
                for (let j = center - 2; j <= center + 2; j++) {
                    if (i >= 0 && i < CONFIG.BOARD_SIZE && j >= 0 && j < CONFIG.BOARD_SIZE) {
                        if (board[i][j] === player) {
                            score += 5;
                        } else if (board[i][j] === opponent) {
                            score -= 5;
                        }
                    }
                }
            }
            
            return score;
        }

        evaluatePosition(board, x, y, player) {
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            
            let totalScore = 0;
            let fourCount = 0;
            let openThreeCount = 0;
            let threeCount = 0;
            
            for (const [dx, dy] of directions) {
                const lineInfo = this.analyzeLine(board, x, y, dx, dy, player);
                
                if (lineInfo.count >= 5) {
                    return this.scores.FIVE;
                } else if (lineInfo.count === 4) {
                    if (lineInfo.openEnds === 2) {
                        return this.scores.OPEN_FOUR; // 活四
                    } else {
                        fourCount++;
                        totalScore += this.scores.FOUR;
                    }
                } else if (lineInfo.count === 3) {
                    if (lineInfo.openEnds === 2) {
                        openThreeCount++;
                        totalScore += this.scores.OPEN_THREE;
                    } else if (lineInfo.openEnds === 1) {
                        threeCount++;
                        totalScore += this.scores.THREE;
                    }
                } else if (lineInfo.count === 2) {
                    if (lineInfo.openEnds === 2) {
                        totalScore += this.scores.OPEN_TWO;
                    } else {
                        totalScore += this.scores.TWO;
                    }
                } else if (lineInfo.count === 1 && lineInfo.openEnds === 2) {
                    totalScore += this.scores.OPEN_TWO / 2;
                }
            }
            
            // 多个活三很危险
            if (openThreeCount >= 2) {
                totalScore += this.scores.OPEN_FOUR;
            }
            
            // 冲四活三（可以获胜的棋型）
            if (fourCount >= 1 && openThreeCount >= 1) {
                totalScore += this.scores.OPEN_FOUR;
            }
            
            return totalScore;
        }

        analyzeLine(board, x, y, dx, dy, player) {
            let count = 1; // 当前位置
            
            // 向前计算连续棋子
            let openEnds = 0;
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) {
                    break;
                }
                
                if (board[nx][ny] === player) {
                    count++;
                } else if (board[nx][ny] === CONFIG.EMPTY) {
                    openEnds = 1;
                    break;
                } else {
                    break;
                }
            }
            
            // 向后计算连续棋子
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) {
                    break;
                }
                
                if (board[nx][ny] === player) {
                    count++;
                } else if (board[nx][ny] === CONFIG.EMPTY) {
                    if (openEnds === 0) openEnds = 1;
                    else if (openEnds === 1) openEnds = 2;
                    break;
                } else {
                    break;
                }
            }
            
            return { count, openEnds };
        }
    }

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
            this.hoverGridX = -1;
            this.hoverGridY = -1;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this.animationEnabled = true;
            
            this.init();
        }

        init() {
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a2e);
            
            // 创建相机 - 正上方俯视，无透视
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera = new THREE.OrthographicCamera(
                -aspect * 10, aspect * 10, 10, -10, 0.1, 1000
            );
            this.camera.position.set(0, 20, 0);
            this.camera.lookAt(0, 0, 0);
            
            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true 
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);
            
            // 添加光源
            this.setupLights();
            
            // 创建棋盘
            this.createBoard();
            
            // 创建悬停指示器
            this.createHoverIndicator();
            
            // 添加事件监听
            this.addEventListeners();
            
            // 开始渲染循环
            this.animate();
            
            // 响应窗口大小变化
            window.addEventListener('resize', () => this.onResize());
        }

        setupLights() {
            // 环境光 - 提高亮度
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            this.scene.add(ambientLight);
            
            // 主光源 - 提高亮度，缩小阴影范围
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
            mainLight.shadow.radius = 2; // 柔化阴影边缘
            this.scene.add(mainLight);
            
            // 补光 - 提高亮度
            const fillLight = new THREE.DirectionalLight(0x4a4aff, 0.4);
            fillLight.position.set(-10, 10, -10);
            this.scene.add(fillLight);
            
            // 边缘光
            const rimLight = new THREE.DirectionalLight(0xff4757, 0.3);
            rimLight.position.set(0, -10, -15);
            this.scene.add(rimLight);
        }

        createBoard() {
            // 棋盘底座 - 木质材质
            const boardSize = CONFIG.BOARD_SIZE + 0.4;
            const boardGeometry = new THREE.BoxGeometry(
                boardSize,
                0.6,
                boardSize
            );
            
            // 木质颜色 - 棕黄色
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
            
            // 棋盘网格
            this.createGrid();
            
            // 棋盘边框 - 深木色
            this.createBorder();
            
            // 创建点击检测平面（不可见）
            this.createClickPlane();
        }
        
        createClickPlane() {
            // 创建一个不可见的平面用于精确的点击检测
            // 15x15的格子，交叉点范围-7到7，所以平面大小为14
            const clickPlaneSize = CONFIG.BOARD_SIZE - 1; // 14
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
            // 木质棋盘上的线条颜色 - 深棕色
            const gridMaterial = new THREE.LineBasicMaterial({ 
                color: 0x4a3728,
                transparent: false,
                opacity: 1
            });
            
            const gridGeometry = new THREE.BufferGeometry();
            const positions = [];
            
            // 15x15棋盘，格子索引0-14，交叉点坐标-7到7
            const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2); // 7
            
            // 垂直线 - 从-x到+x (范围 -7 到 7)
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                const x = i - centerIndex;
                positions.push(x, 0.02, -centerIndex);
                positions.push(x, 0.02, centerIndex);
            }
            
            // 水平线 - 从-z到+z
            for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
                const z = i - centerIndex;
                positions.push(-centerIndex, 0.02, z);
                positions.push(centerIndex, 0.02, z);
            }
            
            gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
            this.scene.add(grid);
            
            // 添加星位点
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
                // 交叉点坐标
                const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2); // 7
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
            
            // 深木色边框
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
            // 悬停指示器，与棋子匹配（半径0.6）
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
            
            // 棋子半径，与棋盘格子大小匹配
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
            
            // 与网格线位置对齐 - 使用网格线交点坐标
            const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2); // 7
            const boardX = x - centerIndex;
            const boardZ = y - centerIndex;
            const pieceHeight = 0.5; // 棋子放置高度
            
            if (animate && this.animationEnabled) {
                piece.position.set(boardX, 8, boardZ);
                piece.scale.set(0.1, 0.1, 0.1);
                
                // 动画：棋子从高处落下到棋盘上
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
            
            // 禁用右键菜单
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
                // clickPlane范围是 -7 到 7
                // 转换到索引 0-14
                const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2); // 7
                const gridX = Math.floor(point.x + centerIndex);
                const gridY = Math.floor(point.z + centerIndex);
                
                // 检查是否与当前位置相同，避免跳动
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
                    
                    // 与网格线对齐，使用网格线交点坐标
                    const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2); // 7
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
                const centerIndex = Math.floor(CONFIG.BOARD_SIZE / 2); // 7
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
            
            // 正交相机需要更新left, right, top, bottom
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
            // 使用Web Audio API创建简单的音效
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
            // 只保留最近100条记录
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
        // 难度选择
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                gameState.difficulty = btn.dataset.difficulty;
                ai.setDifficulty(btn.dataset.difficulty);
                soundManager.playClick();
            });
        });
        
        // 开始游戏
        document.getElementById('startGame').addEventListener('click', startGame);
        document.getElementById('restartGame').addEventListener('click', restartGame);
        document.getElementById('undoMove').addEventListener('click', undoMove);
        document.getElementById('saveGame').addEventListener('click', saveGame);
        
        // 计时器
        document.getElementById('pauseTimer').addEventListener('click', togglePause);
        document.getElementById('resetTimer').addEventListener('click', resetTimers);
        
        // 设置
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            soundManager.setEnabled(e.target.checked);
        });
        
        document.getElementById('animationToggle').addEventListener('change', (e) => {
            renderer.setAnimationEnabled(e.target.checked);
        });
        
        // 游戏记录
        document.getElementById('loadHistory').addEventListener('click', loadHistory);
        document.getElementById('exportHistory').addEventListener('click', exportHistory);
        document.getElementById('clearHistory').addEventListener('click', clearHistory);
        
        // 弹窗
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
        updateGameMessage('选择难度后点击"开始游戏"', 'info');
        
        updateUI();
        soundManager.playClick();
    }

    function undoMove() {
        if (!gameState.isPlaying || gameState.moves.length < 2) return;
        
        // 撤销AI的棋
        renderer.removeLastPiece();
        gameState.undoMove();
        
        // 撤销玩家的棋
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
        
        // AI回合
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
        
        document.getElementById('totalMoves').textContent = gameState.moves.length;
        document.getElementById('gameDuration').textContent = formatTime(gameState.totalTime);
        document.getElementById('gameDifficulty').textContent = getDifficultyName(gameState.difficulty);
        
        // 更新统计
        const stats = storageManager.updateStats(gameState.gameRecord.result, gameState.totalTime);
        updateStatsDisplay(stats);
        
        // 保存游戏记录
        storageManager.saveGame(gameState.gameRecord);
        loadHistoryList();
        
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
                    <span class="result ${resultClass}">${resultText[resultClass]}</span>
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

    // 页面加载完成后初始化
    window.addEventListener('DOMContentLoaded', init);
    
    // FPS计数器
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

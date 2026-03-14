// 导入常量
const { PHASE_PLACING, PHASE_MOVING, Game, MILL_LINES, ADJACENT, PLAYER_1, PLAYER_2, EMPTY } = require('./game.js');

class TranspositionTable {
    constructor() {
        this.table = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    hash(board, player, phase) {
        let hash = 0;
        for (let i = 0; i < 24; i++) {
            hash = hash * 4 + board[i];
        }
        hash = hash * 3 + player;
        hash = hash * 3 + (phase === PHASE_PLACING ? 0 : phase === PHASE_MOVING ? 1 : 2);
        return hash;
    }

    get(key) {
        const entry = this.table.get(key);
        if (entry) {
            this.hits++;
            return entry;
        }
        this.misses++;
        return null;
    }

    set(key, value, depth, type) {
        const existing = this.table.get(key);
        if (existing && existing.depth >= depth) {
            return;
        }
        this.table.set(key, { value, depth, type });
    }

    clear() {
        this.table.clear();
        this.hits = 0;
        this.misses = 0;
    }

    size() {
        return this.table.size;
    }
}

// MILL_LINES and ADJACENT are defined in game.js

class AI {
    constructor(difficulty = 'hard') {
        this.difficulty = difficulty;
        this.tt = new TranspositionTable();
        this.nodesEvaluated = 0;
        const config = this.getDifficultyConfig(difficulty);
        this.maxDepth = config.maxDepth;
        this.timeLimit = config.timeLimit;
        this.startTime = 0;
        this.bestMove = null;
        this.stopped = false;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        const config = this.getDifficultyConfig(difficulty);
        this.maxDepth = config.maxDepth;
        this.timeLimit = config.timeLimit;
        this.tt.clear();
    }

    getDifficultyConfig(difficulty) {
        if (difficulty === 'easy') {
            return { maxDepth: 2, timeLimit: 250 };
        }

        if (difficulty === 'medium') {
            return { maxDepth: 3, timeLimit: 600 };
        }

        return { maxDepth: 5, timeLimit: 1200 };
    }

    makeMove(game) {
        this.stopped = false;
        this.nodesEvaluated = 0;
        this.startTime = Date.now();
        
        let bestMove = null;
        let bestValue = -Infinity;
        
        const player = game.state.currentPlayer;
        
        if (game.state.millFormed) {
            const removable = game.getRemovablePieces(player);
            if (removable.length > 0) {
                return { type: 'remove', position: removable[0] };
            }
        }

        const moves = game.getValidMoves(player);
        
        if (moves.length === 0) {
            return null;
        }

        const scoredMoves = this.orderMoves(moves, game, player);
        
        for (const move of scoredMoves) {
            if (this.stopped) break;
            
            const newGame = this.cloneGame(game);
            
            if (game.state.phase === PHASE_PLACING) {
                newGame.placePiece(move.to);
            } else {
                newGame.movePiece(move.from, move.to);
            }

            if (newGame.state.millFormed) {
                const removable = newGame.getRemovablePieces(newGame.state.currentPlayer);
                if (removable.length > 0) {
                    return move;
                }
            }

            const value = this.minimax(newGame, this.maxDepth - 1, -Infinity, Infinity, false, player);
            
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        if (!bestMove && moves.length > 0) {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
        }

        this.bestMove = bestMove;
        return bestMove;
    }

    orderMoves(moves, game, player) {
        const scored = moves.map(move => {
            let score = 0;
            const tempGame = this.cloneGame(game);
            
            if (game.state.phase === PHASE_PLACING) {
                tempGame.placePiece(move.to);
            } else {
                tempGame.movePiece(move.from, move.to);
            }

            if (tempGame.state.millFormed) {
                score += 1000;
            }

            for (const line of MILL_LINES) {
                if (line.includes(move.to)) {
                    const [a, b, c] = line;
                    let count = 0;
                    if (tempGame.state.board[a] === player) count++;
                    if (tempGame.state.board[b] === player) count++;
                    if (tempGame.state.board[c] === player) count++;
                    if (count === 2) score += 50;
                }
            }

            const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
            if (this.canFormMill(tempGame, opponent, move.to)) {
                score -= 30;
            }

            return { ...move, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    canFormMill(game, player, position) {
        for (const line of MILL_LINES) {
            if (line.includes(position)) {
                const [a, b, c] = line;
                const pieces = [game.state.board[a], game.state.board[b], game.state.board[c]];
                const playerPieces = pieces.filter(p => p === player).length;
                const empty = pieces.filter(p => p === 0).length;
                if (playerPieces === 2 && empty === 1) {
                    return true;
                }
            }
        }
        return false;
    }

    minimax(game, depth, alpha, beta, isMaximizing, originalPlayer) {
        this.nodesEvaluated++;

        if (Date.now() - this.startTime > this.timeLimit) {
            this.stopped = true;
            return game.evaluatePosition(originalPlayer);
        }

        const currentPlayer = game.state.currentPlayer;
        
        if (game.gameOver) {
            if (game.winner === originalPlayer) {
                return 100000 + depth;
            } else {
                return -100000 - depth;
            }
        }

        if (depth <= 0) {
            return game.evaluatePosition(originalPlayer);
        }

        const key = this.ttHash(game.state.board, currentPlayer, game.state.phase);
        const ttEntry = this.tt.get(key);
        
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.type === 'exact') {
                return ttEntry.value;
            } else if (ttEntry.type === 'lower' && ttEntry.value > beta) {
                return ttEntry.value;
            } else if (ttEntry.type === 'upper' && ttEntry.value < alpha) {
                return ttEntry.value;
            }
        }

        if (game.state.millFormed) {
            const removable = game.getRemovablePieces(currentPlayer);
            if (removable.length > 0) {
                let bestValue = isMaximizing ? -Infinity : Infinity;
                
                for (const pos of removable) {
                    const newGame = this.cloneGame(game);
                    newGame.removePiece(pos);
                    
                    const value = this.minimax(newGame, depth - 1, alpha, beta, !isMaximizing, originalPlayer);
                    
                    if (isMaximizing) {
                        bestValue = Math.max(bestValue, value);
                        alpha = Math.max(alpha, value);
                    } else {
                        bestValue = Math.min(bestValue, value);
                        beta = Math.min(beta, value);
                    }
                    
                    if (beta <= alpha) break;
                }
                
                return bestValue;
            }
        }

        const moves = game.getValidMoves(currentPlayer);
        
        if (moves.length === 0) {
            const winner = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
            if (winner === originalPlayer) {
                return 100000 + depth;
            } else {
                return -100000 - depth;
            }
        }

        const orderedMoves = this.orderMoves(moves, game, currentPlayer);
        
        let bestValue = isMaximizing ? -Infinity : Infinity;
        let type = isMaximizing ? 'lower' : 'upper';

        for (const move of orderedMoves) {
            if (this.stopped) break;

            const newGame = this.cloneGame(game);
            
            if (game.state.phase === PHASE_PLACING) {
                newGame.placePiece(move.to);
            } else {
                newGame.movePiece(move.from, move.to);
            }

            const value = this.minimax(newGame, depth - 1, alpha, beta, !isMaximizing, originalPlayer);

            if (isMaximizing) {
                if (value > bestValue) {
                    bestValue = value;
                    type = 'exact';
                }
                alpha = Math.max(alpha, value);
            } else {
                if (value < bestValue) {
                    bestValue = value;
                    type = 'exact';
                }
                beta = Math.min(beta, value);
            }

            if (beta <= alpha) break;
        }

        this.tt.set(key, bestValue, depth, type);
        
        return bestValue;
    }

    ttHash(board, player, phase) {
        let hash = 0;
        for (let i = 0; i < 24; i++) {
            hash = hash * 4 + board[i];
        }
        hash = hash * 3 + player;
        hash = hash * 3 + (phase === PHASE_PLACING ? 0 : phase === PHASE_MOVING ? 1 : 2);
        return hash;
    }

    cloneGame(game) {
        const newGame = new Game();
        newGame.state = game.state.clone();
        newGame.gameOver = game.gameOver;
        newGame.winner = game.winner;
        return newGame;
    }

    getStats() {
        return {
            nodesEvaluated: this.nodesEvaluated,
            ttHits: this.tt.hits,
            ttMisses: this.tt.misses,
            ttSize: this.tt.table.size
        };
    }
}

// 导出模块
module.exports = AI;

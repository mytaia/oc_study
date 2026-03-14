const EMPTY = 0;
const PLAYER_1 = 1;
const PLAYER_2 = 2;

const PHASE_PLACING = 'placing';
const PHASE_MOVING = 'moving';

const MILL_LINES = [
    // 外圈（4条）
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    // 中圈（4条）
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    // 内圈（4条）
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    // 跨圈（4条）
    [7, 15, 23],  // 水平左
    [3, 11, 19],   // 水平右
    [1, 9, 17],    // 垂直上
    [5, 13, 21]    // 垂直下
];

const ADJACENT = [
    [1, 7], [0, 2, 9], [1, 3], [2, 4, 11],       // 外圈 0-7
    [3, 5], [4, 6, 13], [5, 7], [6, 0, 15],       // 外圈
    
    [9, 15], [8, 10, 1, 17], [9, 11], [10, 12, 3, 19], // 中圈 8-15
    [11, 13], [12, 14, 5, 21], [13, 15], [14, 8, 7, 23], // 中圈
    
    [17, 23], [16, 18, 9], [17, 19], [18, 20, 11], // 内圈 16-23
    [19, 21], [20, 22, 13], [21, 23], [22, 16, 15]  // 内圈
];

class GameState {
    constructor() {
        this.board = Array(24).fill(EMPTY);
        this.player1Pieces = 9;
        this.player2Pieces = 9;
        this.player1PiecesOnBoard = 0;
        this.player2PiecesOnBoard = 0;
        this.currentPlayer = PLAYER_1;
        this.phase = PHASE_PLACING;
        this.history = [];
        this.selectedPiece = null;
        this.millFormed = false;
        this.removePiece = null;
        this.blockedPositions = [];
    }

    clone(includeHistory = false) {
        const newState = new GameState();
        newState.board = [...this.board];
        newState.player1Pieces = this.player1Pieces;
        newState.player2Pieces = this.player2Pieces;
        newState.player1PiecesOnBoard = this.player1PiecesOnBoard;
        newState.player2PiecesOnBoard = this.player2PiecesOnBoard;
        newState.currentPlayer = this.currentPlayer;
        newState.phase = this.phase;
        newState.selectedPiece = this.selectedPiece;
        newState.millFormed = this.millFormed;
        newState.removePiece = this.removePiece;
        newState.blockedPositions = [...this.blockedPositions];
        newState.history = includeHistory ? [...this.history] : [];
        return newState;
    }
}

class Game {
    constructor() {
        this.state = new GameState();
        this.gameOver = false;
        this.winner = null;
        this.onMoveCallback = null;
        this.onAIMoveCallback = null;
    }

    reset() {
        this.state = new GameState();
        this.gameOver = false;
        this.winner = null;
    }

    pushHistorySnapshot() {
        this.state.history.push({
            state: this.state.clone(false),
            gameOver: this.gameOver,
            winner: this.winner
        });
    }

    getCurrentPlayer() {
        return this.state.currentPlayer;
    }

    getOpponent(player) {
        return player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    }

    getCurrentPhase() {
        return this.state.phase;
    }

    getPiecesRemaining(player) {
        return player === PLAYER_1 ? this.state.player1Pieces : this.state.player2Pieces;
    }

    getPiecesOnBoard(player) {
        return player === PLAYER_1 ? this.state.player1PiecesOnBoard : this.state.player2PiecesOnBoard;
    }

    isValidPosition(index) {
        return index >= 0 && index < 24;
    }

    isValidMove(from, to) {
        if (this.state.phase === PHASE_PLACING) {
            return this.state.board[to] === EMPTY;
        }

        if (this.state.phase === PHASE_MOVING) {
            if (this.state.board[from] !== this.state.currentPlayer) return false;
            if (this.state.board[to] !== EMPTY) return false;
            const adj = ADJACENT[from];
            return adj.includes(to);
        }

        return false;
    }

    getValidPlacements() {
        const moves = [];
        for (let i = 0; i < 24; i++) {
            if (this.state.board[i] === EMPTY && 
                !this.state.blockedPositions.includes(i)) {
                moves.push({ to: i });
            }
        }
        return moves;
    }

    getValidMoves(player) {
        const moves = [];
        
        if (this.state.phase === PHASE_PLACING) {
            return this.getValidPlacements();
        }

        for (let i = 0; i < 24; i++) {
            if (this.state.board[i] === player) {
                const adj = ADJACENT[i];
                for (const dest of adj) {
                    if (this.state.board[dest] === EMPTY) {
                        moves.push({ from: i, to: dest });
                    }
                }
            }
        }

        return moves;
    }

    hasValidMoves(player) {
        return this.getValidMoves(player).length > 0;
    }

    formsMill(player, position) {
        for (const line of MILL_LINES) {
            if (line.includes(position)) {
                const [a, b, c] = line;
                if (this.state.board[a] === player &&
                    this.state.board[b] === player &&
                    this.state.board[c] === player) {
                    return true;
                }
            }
        }
        return false;
    }

    getMills(player) {
        const mills = [];
        for (const line of MILL_LINES) {
            const [a, b, c] = line;
            if (this.state.board[a] === player &&
                this.state.board[b] === player &&
                this.state.board[c] === player) {
                mills.push(line);
            }
        }
        return mills;
    }

    getMillAtPosition(player, position) {
        for (const line of MILL_LINES) {
            if (line.includes(position)) {
                const [a, b, c] = line;
                if (this.state.board[a] === player &&
                    this.state.board[b] === player &&
                    this.state.board[c] === player) {
                    return line;
                }
            }
        }
        return null;
    }

    canRemovePiece(player) {
        const opponent = this.getOpponent(player);
        for (let i = 0; i < 24; i++) {
            if (this.state.board[i] === opponent) {
                if (!this.formsMill(opponent, i)) {
                    return true;
                }
            }
        }
        return false;
    }

    getRemovablePieces(player) {
        const opponent = this.getOpponent(player);
        const removable = [];
        for (let i = 0; i < 24; i++) {
            if (this.state.board[i] === opponent) {
                if (!this.formsMill(opponent, i)) {
                    removable.push(i);
                }
            }
        }
        if (removable.length === 0) {
            for (let i = 0; i < 24; i++) {
                if (this.state.board[i] === opponent) {
                    removable.push(i);
                }
            }
        }
        return removable;
    }

    placePiece(position) {
        if (this.state.phase !== PHASE_PLACING) return false;
        if (this.state.board[position] !== EMPTY) return false;
        
        if (this.state.blockedPositions.includes(position)) {
            return false;
        }

        this.pushHistorySnapshot();

        const player = this.state.currentPlayer;
        this.state.board[position] = player;
        
        if (player === PLAYER_1) {
            this.state.player1Pieces--;
            this.state.player1PiecesOnBoard++;
        } else {
            this.state.player2Pieces--;
            this.state.player2PiecesOnBoard++;
        }

        if (this.formsMill(player, position)) {
            this.state.millFormed = true;
            this.state.removePiece = player;
            return true;
        }

        this.switchPlayer();
        this.checkPhaseChange();
        this.checkGameOver();
        
        return true;
    }

    movePiece(from, to) {
        if (this.state.phase === PHASE_PLACING) return false;
        
        const player = this.state.currentPlayer;
        if (this.state.board[from] !== player) return false;
        if (this.state.board[to] !== EMPTY) return false;

        if (this.state.phase === PHASE_MOVING) {
            const adj = ADJACENT[from];
            if (!adj.includes(to)) return false;
        }

        this.pushHistorySnapshot();

        this.state.board[from] = EMPTY;
        this.state.board[to] = player;

        if (this.formsMill(player, to)) {
            this.state.millFormed = true;
            this.state.removePiece = player;
            return true;
        }

        this.switchPlayer();
        this.checkGameOver();
        
        return true;
    }

    removePiece(position) {
        if (this.state.removePiece === null) return false;
        
        const player = this.state.removePiece;
        const opponent = this.getOpponent(player);
        
        if (this.state.board[position] !== opponent) return false;

        if (!this.canRemovePiece(player)) {
        } else {
            const removable = this.getRemovablePieces(player);
            if (!removable.includes(position)) return false;
        }

        this.pushHistorySnapshot();

        this.state.board[position] = EMPTY;
        
        if (this.state.phase === PHASE_PLACING) {
            this.state.blockedPositions.push(position);
        }
        
        if (opponent === PLAYER_1) {
            this.state.player1PiecesOnBoard--;
        } else {
            this.state.player2PiecesOnBoard--;
        }

        this.state.millFormed = false;
        this.state.removePiece = null;

        this.switchPlayer();
        this.checkPhaseChange();
        this.checkGameOver();

        return true;
    }

    selectPiece(position) {
        if (this.state.phase === PHASE_PLACING) {
            return this.placePiece(position);
        }

        if (this.state.removePiece !== null) {
            return this.removePiece(position);
        }

        if (this.state.selectedPiece === null) {
            if (this.state.board[position] === this.state.currentPlayer) {
                this.state.selectedPiece = position;
                return { selecting: true, position: position };
            }
            return false;
        }

        if (this.state.board[position] === this.state.currentPlayer) {
            this.state.selectedPiece = position;
            return { selecting: true, position: position };
        }

        if (this.state.board[position] === EMPTY) {
            const result = this.movePiece(this.state.selectedPiece, position);
            if (result) {
                this.state.selectedPiece = null;
            }
            return result;
        }

        return false;
    }

    deselectPiece() {
        this.state.selectedPiece = null;
    }

    switchPlayer() {
        this.state.currentPlayer = this.getOpponent(this.state.currentPlayer);
    }

    checkPhaseChange() {
        if (this.state.player1Pieces === 0 && this.state.player2Pieces === 0) {
            this.state.phase = PHASE_MOVING;
            this.state.blockedPositions = [];
        }
    }

    checkGameOver() {
        const player1Total = this.state.player1Pieces + this.state.player1PiecesOnBoard;
        const player2Total = this.state.player2Pieces + this.state.player2PiecesOnBoard;

        if (player1Total < 3) {
            this.gameOver = true;
            this.winner = PLAYER_2;
            return;
        }

        if (player2Total < 3) {
            this.gameOver = true;
            this.winner = PLAYER_1;
            return;
        }

        if (this.state.phase === PHASE_MOVING) {
            const current = this.state.currentPlayer;
            if (!this.hasValidMoves(current)) {
                this.gameOver = true;
                this.winner = this.getOpponent(current);
            }
        }
    }

    undo() {
        if (this.state.history.length === 0) return false;

        const snapshot = this.state.history.pop();
        const remainingHistory = [...this.state.history];

        this.state = snapshot.state.clone(false);
        this.state.history = remainingHistory;
        this.gameOver = snapshot.gameOver;
        this.winner = snapshot.winner;

        return true;
    }

    getBoard() {
        return [...this.state.board];
    }

    isMillFormed() {
        return this.state.millFormed;
    }

    getRemovingPlayer() {
        return this.state.removePiece;
    }

    getSelectedPiece() {
        return this.state.selectedPiece;
    }

    getBlockedPositions() {
        return [...this.state.blockedPositions];
    }

    getAvailablePlacements() {
        const placements = [];
        for (let i = 0; i < 24; i++) {
            if (this.state.board[i] === EMPTY && 
                !this.state.blockedPositions.includes(i)) {
                placements.push(i);
            }
        }
        return placements;
    }

    getCurrentMills() {
        if (!this.state.millFormed) return [];
        return this.getMills(this.state.currentPlayer);
    }

    evaluatePosition(player) {
        const opponent = this.getOpponent(player);
        
        const playerOnBoard = this.getPiecesOnBoard(player);
        const opponentOnBoard = this.getPiecesOnBoard(opponent);
        
        if (playerOnBoard < 3) return -10000;
        if (opponentOnBoard < 3) return 10000;

        let score = 0;

        score += playerOnBoard * 100;
        score -= opponentOnBoard * 100;

        const playerMills = this.getMills(player).length;
        const opponentMills = this.getMills(opponent).length;
        score += playerMills * 50;
        score -= opponentMills * 50;

        const playerPieces = this.getPiecesRemaining(player) + playerOnBoard;
        const opponentPieces = this.getPiecesRemaining(opponent) + opponentOnBoard;
        score += playerPieces * 20;
        score -= opponentPieces * 20;

        for (let i = 0; i < 24; i++) {
            if (this.state.board[i] === player) {
                const adj = ADJACENT[i];
                let potentialMills = 0;
                for (const line of MILL_LINES) {
                    if (line.includes(i)) {
                        const [a, b, c] = line;
                        let count = 0;
                        let empty = 0;
                        if (this.state.board[a] === player) count++;
                        else if (this.state.board[a] === EMPTY) empty++;
                        if (this.state.board[b] === player) count++;
                        else if (this.state.board[b] === EMPTY) empty++;
                        if (this.state.board[c] === player) count++;
                        else if (this.state.board[c] === EMPTY) empty++;
                        
                        if (count === 2 && empty === 1) {
                            potentialMills++;
                        }
                    }
                }
                score += potentialMills * 10;
            }
        }

        const playerMoves = this.getValidMoves(player).length;
        const opponentMoves = this.getValidMoves(opponent).length;
        score += playerMoves * 5;
        score -= opponentMoves * 5;

        return score;
    }
}

// 导出模块
module.exports = {
    Game,
    EMPTY,
    PLAYER_1,
    PLAYER_2,
    PHASE_PLACING,
    PHASE_MOVING,
    MILL_LINES,
    ADJACENT
};

import { ref } from 'vue'
import type { Position, Piece, PieceColor } from '@/types'
import { useGame } from './useGame'

const PIECE_VALUES: Record<string, number> = {
  k: 10000,
  a: 20,
  b: 20,
  n: 40,
  r: 100,
  c: 45,
  p: 10
}

const POSITION_BONUS: Record<string, number[][]> = {
  k: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  a: [
    [0, -2, 0, 0, 0, 0, 0, -2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, -2, 0, 0, 0, 0, 0, -2, 0]
  ],
  b: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  c: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 4, 6, 8, 10, 8, 6, 4, 2],
    [4, 8, 12, 16, 20, 16, 12, 8, 4],
    [6, 12, 18, 24, 30, 24, 18, 12, 6],
    [8, 16, 24, 32, 40, 32, 24, 16, 8],
    [10, 20, 30, 40, 50, 40, 30, 20, 10],
    [14, 28, 42, 56, 70, 56, 42, 28, 14],
    [20, 40, 60, 80, 100, 80, 60, 40, 20]
  ]
}

const RED = 'r'
const BLACK = 'b'

export function useAI(game: ReturnType<typeof useGame>) {
  const searchDepth = ref(2)

  function setLevel(level: number) {
    if (level === 1) searchDepth.value = 1
    else if (level === 2) searchDepth.value = 2
    else searchDepth.value = 3
  }

  function evaluateBoard(board: (Piece | null)[][]): number {
    let score = 0
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c]
        if (piece) {
          const value = PIECE_VALUES[piece.type] || 0
          const positionBonus = POSITION_BONUS[piece.type]?.[r]?.[c] || 0
          
          if (piece.color === BLACK) {
            score -= value + positionBonus
          } else {
            score += value + positionBonus
          }
        }
      }
    }
    
    return score
  }

  function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
    return board.map(row => row.map(cell => cell ? { ...cell, position: { ...cell.position } } : null))
  }

  function getAllMoves(board: (Piece | null)[][], color: PieceColor): { from: Position, to: Position }[] {
    const moves: { from: Position, to: Position }[] = []
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c]
        if (piece && piece.color === color) {
          const pieceMoves = getPieceMoves(board, piece, r, c)
          for (const to of pieceMoves) {
            moves.push({ from: { row: r, col: c }, to })
          }
        }
      }
    }
    
    return moves
  }

  function getPieceMoves(board: (Piece | null)[][], piece: Piece, row: number, col: number): Position[] {
    const moves: Position[] = []
    const color = piece.color
    
    const addMove = (r: number, c: number) => {
      if (r >= 0 && r <= 9 && c >= 0 && c <= 8) {
        const target = board[r][c]
        if (!target || target.color !== color) {
          moves.push({ row: r, col: c })
        }
      }
    }
    
    const isInPalace = (r: number, c: number, col: PieceColor): boolean => {
      if (col === RED) return r >= 0 && r <= 2 && c >= 3 && c <= 5
      else return r >= 7 && r <= 9 && c >= 3 && c <= 5
    }
    
    switch (piece.type) {
      case 'k':
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
          const r = row + dr, c = col + dc
          if (isInPalace(r, c, color)) addMove(r, c)
        })
        break
      case 'a':
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
          const r = row + dr, c = col + dc
          if (isInPalace(r, c, color) && !board[row + dr / 2]?.[col + dc / 2]) addMove(r, c)
        })
        break
      case 'b':
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
          const r = row + dr, c = col + dc
          const validRiver = color === RED ? r >= 0 && r <= 4 : r >= 5 && r <= 9
          if (validRiver && !board[row + dr / 2]?.[col + dc / 2]) addMove(r, c)
        })
        break
      case 'n':
        [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]].forEach(([dr, dc]) => {
          const r = row + dr, c = col + dc
          if (r >= 0 && r <= 9 && c >= 0 && c <= 8) {
            if (Number.isInteger(dr / 2) && Number.isInteger(dc / 2)) {
              if (!board[row + dr / 2]?.[col + dc / 2]) addMove(r, c)
            } else {
              if (!board[row]?.[col + dc / 2]) addMove(r, c)
            }
          }
        })
        break
      case 'r':
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
          let r = row + dr, c = col + dc
          while (r >= 0 && r <= 9 && c >= 0 && c <= 9) {
            if (board[r][c]) {
              if (board[r][c]!.color !== color) addMove(r, c)
              break
            }
            addMove(r, c)
            r += dr
            c += dc
          }
        })
        break
      case 'c':
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
          let r = row + dr, c = col + dc
          while (r >= 0 && r <= 9 && c >= 0 && c <= 9) {
            if (board[r][c]) {
              let r2 = r + dr, c2 = c + dc, jumped = false
              while (r2 >= 0 && r2 <= 9 && c2 >= 0 && c2 <= 9) {
                if (board[r2][c2]) {
                  if (jumped && board[r2][c2]!.color !== color) addMove(r2, c2)
                  break
                }
                r2 += dr
                c2 += dc
                jumped = true
              }
              break
            }
            r += dr
            c += dc
          }
        })
        break
      case 'p':
        if (color === RED) {
          if (row > 4) {
            [[0, -1], [0, 1]].forEach(([dr, dc]) => addMove(row + dr, col + dc))
          }
          addMove(row - 1, col)
        } else {
          if (row < 5) {
            [[0, -1], [0, 1]].forEach(([dr, dc]) => addMove(row + dr, col + dc))
          }
          addMove(row + 1, col)
        }
        break
    }
    
    return moves
  }

  function minimax(
    board: (Piece | null)[][],
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    if (depth === 0) {
      return evaluateBoard(board)
    }
    
    const currentColor: PieceColor = isMaximizing ? RED : BLACK
    const moves = getAllMoves(board, currentColor)
    
    if (moves.length === 0) {
      return isMaximizing ? -10000 : 10000
    }
    
    if (isMaximizing) {
      let maxEval = -Infinity
      for (const move of moves) {
        const newBoard = cloneBoard(board)
        const piece = newBoard[move.from.row][move.from.col]
        newBoard[move.to.row][move.to.col] = piece
        newBoard[move.from.row][move.from.col] = null
        
        const evaluation = minimax(newBoard, depth - 1, alpha, beta, false)
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)
        if (beta <= alpha) break
      }
      return maxEval
    } else {
      let minEval = Infinity
      for (const move of moves) {
        const newBoard = cloneBoard(board)
        const piece = newBoard[move.from.row][move.from.col]
        newBoard[move.to.row][move.to.col] = piece
        newBoard[move.from.row][move.from.col] = null
        
        const evaluation = minimax(newBoard, depth - 1, alpha, beta, true)
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)
        if (beta <= alpha) break
      }
      return minEval
    }
  }

  function getAIMove(): { from: Position, to: Position } | null {
    const moves = getAllMoves(game.board.value, BLACK)
    
    if (moves.length === 0) return null
    
    let bestMove = moves[0]
    let bestScore = Infinity
    
    for (const move of moves) {
      const newBoard = cloneBoard(game.board.value)
      const piece = newBoard[move.from.row][move.from.col]
      newBoard[move.to.row][move.to.col] = piece
      newBoard[move.from.row][move.from.col] = null
      
      const score = minimax(newBoard, searchDepth.value, -Infinity, Infinity, true)
      
      if (score < bestScore) {
        bestScore = score
        bestMove = move
      }
    }
    
    return bestMove
  }

  async function makeAIMove() {
    if (game.isGameOver.value || game.isAIThinking.value) return
    
    game.isAIThinking.value = true
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const move = getAIMove()
    
    if (move) {
      game.makeMove(move.from, move.to)
    }
    
    game.isAIThinking.value = false
  }

  return {
    searchDepth,
    setLevel,
    makeAIMove,
    getAIMove
  }
}

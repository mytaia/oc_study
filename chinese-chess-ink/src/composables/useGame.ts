import { ref } from 'vue'
import type { Piece, Position, Move, PlayerColor, PieceColor } from '@/types'
import { INITIAL_BOARD, PIECE_NAMES } from '@/types'

export function useGame() {
  const board = ref<(Piece | null)[][]>(JSON.parse(JSON.stringify(INITIAL_BOARD)))
  const currentPlayer = ref<PlayerColor>('red')
  const selectedPos = ref<Position | null>(null)
  const legalMoves = ref<Position[]>([])
  const lastMove = ref<Move | null>(null)
  const moveHistory = ref<Move[]>([])
  const isCheck = ref(false)
  const isCheckmate = ref(false)
  const isGameOver = ref(false)
  const winner = ref<PlayerColor | null>(null)
  const isAIThinking = ref(false)
  const aiLevel = ref(2)

  const RED = 'r'
  const BLACK = 'b'

  function getPieceAt(row: number, col: number): Piece | null {
    if (row < 0 || row > 9 || col < 0 || col > 8) return null
    return board.value[row][col]
  }

  function isInPalace(row: number, col: number, color: PieceColor): boolean {
    if (color === RED) {
      return row >= 0 && row <= 2 && col >= 3 && col <= 5
    } else {
      return row >= 7 && row <= 9 && col >= 3 && col <= 5
    }
  }

  function isOnBoard(row: number, col: number): boolean {
    return row >= 0 && row <= 9 && col >= 0 && col <= 8
  }

  function getLegalMoves(piece: Piece): Position[] {
    const moves: Position[] = []
    const { row, col } = piece.position
    const color = piece.color

    const addMove = (r: number, c: number) => {
      if (!isOnBoard(r, c)) return
      const target = getPieceAt(r, c)
      if (!target || target.color !== color) {
        moves.push({ row: r, col: c })
      }
    }

    const addSlideMoves = (directions: number[][]) => {
      for (const [dr, dc] of directions) {
        let r = row + dr
        let c = col + dc
        while (isOnBoard(r, c)) {
          const target = getPieceAt(r, c)
          if (target) {
            if (target.color !== color) {
              moves.push({ row: r, col: c })
            }
            break
          }
          moves.push({ row: r, col: c })
          r += dr
          c += dc
        }
      }
    }

    switch (piece.type) {
      case 'k':
        const palaceMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]]
        for (const [dr, dc] of palaceMoves) {
          const r = row + dr
          const c = col + dc
          if (isInPalace(r, c, color)) {
            addMove(r, c)
          }
        }
        break

      case 'a':
        const diagonalMoves = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        for (const [dr, dc] of diagonalMoves) {
          const r = row + dr
          const c = col + dc
          if (isInPalace(r, c, color)) {
            const eyeRow = row + dr / 2
            const eyeCol = col + dc / 2
            const eye = getPieceAt(eyeRow, eyeCol)
            if (!eye) {
              addMove(r, c)
            }
          }
        }
        break

      case 'b':
        const bishopMoves = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        for (const [dr, dc] of bishopMoves) {
          const r = row + dr
          const c = col + dc
          const validRiver = color === RED ? r >= 0 && r <= 4 : r >= 5 && r <= 9
          if (validRiver) {
            const eyeRow = row + dr / 2
            const eyeCol = col + dc / 2
            const eye = getPieceAt(eyeRow, eyeCol)
            if (!eye) {
              addMove(r, c)
            }
          }
        }
        break

      case 'n':
        const knightMoves = [
          [-2, -1], [-2, 1], [2, -1], [2, 1],
          [-1, -2], [-1, 2], [1, -2], [1, 2]
        ]
        for (const [dr, dc] of knightMoves) {
          const r = row + dr
          const c = col + dc
          if (!isOnBoard(r, c)) continue
          
          const blockRow = row + dr / 2
          const blockCol = col + dc / 2
          if (Number.isInteger(dr / 2) && Number.isInteger(dc / 2)) {
            const block = getPieceAt(blockRow, blockCol)
            if (block) continue
          } else {
            const block = getPieceAt(row, col + dc / 2)
            if (block) continue
          }
          addMove(r, c)
        }
        break

      case 'r':
        addSlideMoves([[-1, 0], [1, 0], [0, -1], [0, 1]])
        break

      case 'c':
        // 炮的走法：移动时不能有子隔挡，吃子时需要隔一子
        for (let i = 0; i < 4; i++) {
          const [dr, dc] = [[-1, 0], [1, 0], [0, -1], [0, 1]][i]
          let r = row + dr
          let c = col + dc
          // 移动：检查路径上是否有子
          while (isOnBoard(r, c)) {
            if (getPieceAt(r, c)) {
              // 找到第一个子，检查是否可以吃（隔子打）
              let r2 = r + dr
              let c2 = c + dc
              let jumped = false
              while (isOnBoard(r2, c2)) {
                if (getPieceAt(r2, c2)) {
                  if (jumped && getPieceAt(r2, c2)!.color !== color) {
                    moves.push({ row: r2, col: c2 })
                  }
                  break
                }
                r2 += dr
                c2 += dc
                jumped = true
              }
              break
            }
            moves.push({ row: r, col: c })
            r += dr
            c += dc
          }
        }
        break

      case 'p':
        // 兵的走法：未过河只能向前，过河后可左右
        if (color === RED) {
          // 红兵：向上( row 减小 )，过河后( row <= 4 )可左右
          addMove(row - 1, col)
          if (row <= 4) {
            addMove(row, col - 1)
            addMove(row, col + 1)
          }
        } else {
          // 黑兵：向下( row 增大 )，过河后( row >= 5 )可左右
          addMove(row + 1, col)
          if (row >= 5) {
            addMove(row, col - 1)
            addMove(row, col + 1)
          }
        }
        break
    }

    return moves.filter(move => {
      const testBoard = board.value.map(row => [...row])
      const testPiece = { ...piece, position: move }
      testBoard[piece.position.row][piece.position.col] = null
      testBoard[move.row][move.col] = testPiece
      return !isKingInCheck(testBoard, color)
    })
  }

  function isKingInCheck(testBoard: (Piece | null)[][], color: PieceColor): boolean {
    let kingPos: Position | null = null
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = testBoard[r][c]
        if (p && p.type === 'k' && p.color === color) {
          kingPos = { row: r, col: c }
          break
        }
      }
      if (kingPos) break
    }

    if (!kingPos) return true

    const enemyColor = color === RED ? BLACK : RED
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = testBoard[r][c]
        if (p && p.color === enemyColor) {
          if (p.type === 'r' || p.type === 'c' || p.type === 'p') {
            const directions = p.type === 'r' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] :
                              p.type === 'c' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] :
                              p.color === RED ? [[-1, 0]] : [[1, 0]]
            
            for (const [dr, dc] of directions) {
              if (p.type === 'c') {
                let count = 0
                let nr = r + dr
                let nc = c + dc
                while (isOnBoard(nr, nc)) {
                  if (testBoard[nr][nc]) {
                    count++
                    if (count === 1 && nr === kingPos.row && nc === kingPos.col) {
                      return true
                    }
                    if (count >= 2) break
                  }
                  nr += dr
                  nc += dc
                }
              } else if (p.type === 'r' || p.type === 'p') {
                let nr = r + dr
                let nc = c + dc
                let blocked = false
                while (isOnBoard(nr, nc)) {
                  if (testBoard[nr][nc]) {
                    if (!blocked && nr === kingPos.row && nc === kingPos.col) {
                      return true
                    }
                    blocked = true
                  }
                  nr += dr
                  nc += dc
                }
              }
            }
          } else if (p.type === 'n') {
            const knightMoves = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]]
            for (const [dr, dc] of knightMoves) {
              const nr = r + dr
              const nc = c + dc
              if (nr === kingPos.row && nc === kingPos.col) {
                const blockRow = r + dr / 2
                const blockCol = c + dc / 2
                if (Number.isInteger(dr / 2) && Number.isInteger(dc / 2)) {
                  if (!testBoard[blockRow][blockCol]) return true
                } else {
                  if (!testBoard[r][blockCol]) return true
                }
              }
            }
          } else if (p.type === 'b') {
            const bishopMoves = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            for (const [dr, dc] of bishopMoves) {
              const r1 = r + dr
              const c1 = c + dc
              const r2 = r + dr * 2
              const c2 = c + dc * 2
              const validRiver = p.color === RED ? r2 >= 0 && r2 <= 4 : r2 >= 5 && r2 <= 9
              if (validRiver && r2 === kingPos.row && c2 === kingPos.col) {
                const eye = getPieceAt(r1, c1)
                if (!eye) return true
              }
            }
          } else if (p.type === 'a') {
            const advisorMoves = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            for (const [dr, dc] of advisorMoves) {
              const nr = r + dr
              const nc = c + dc
              if (isInPalace(nr, nc, enemyColor) && nr === kingPos.row && nc === kingPos.col) {
                return true
              }
            }
          } else if (p.type === 'k') {
            const kingMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]]
            for (const [dr, dc] of kingMoves) {
              const nr = r + dr
              const nc = c + dc
              if (isInPalace(nr, nc, enemyColor) && nr === kingPos.row && nc === kingPos.col) {
                return true
              }
            }
          }
        }
      }
    }

    return false
  }

  function selectCell(row: number, col: number) {
    if (isGameOver.value || isAIThinking.value) return

    const piece = getPieceAt(row, col)
    
    if (selectedPos.value) {
      const move = legalMoves.value.find(m => m.row === row && m.col === col)
      if (move) {
        makeMove(selectedPos.value, move)
        return
      }
    }

    if (piece && ((piece.color === RED && currentPlayer.value === 'red') || 
                  (piece.color === BLACK && currentPlayer.value === 'black'))) {
      selectedPos.value = { row, col }
      legalMoves.value = getLegalMoves(piece)
    } else {
      selectedPos.value = null
      legalMoves.value = []
    }
  }

  function makeMove(from: Position, to: Position) {
    const piece = getPieceAt(from.row, from.col)
    if (!piece) return

    const captured = getPieceAt(to.row, to.col)
    
    const move: Move = {
      from: { ...from },
      to: { ...to },
      piece: { ...piece },
      captured: captured ? { ...captured } : undefined
    }

    board.value[to.row][to.col] = { ...piece, position: { ...to } }
    board.value[from.row][from.col] = null

    lastMove.value = move
    moveHistory.value.push(move)

    const nextPlayer = currentPlayer.value === 'red' ? 'black' : 'red'
    const nextColor: PieceColor = nextPlayer === 'red' ? RED : BLACK
    isCheck.value = isKingInCheck(board.value, nextColor)

    selectedPos.value = null
    legalMoves.value = []
    currentPlayer.value = nextPlayer

    if (isCheck.value) {
      const allMoves: Position[] = []
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const p = getPieceAt(r, c)
          if (p && p.color === nextColor) {
            const moves = getLegalMoves(p)
            allMoves.push(...moves)
          }
        }
      }
      
      if (allMoves.length === 0) {
        isCheckmate.value = true
        isGameOver.value = true
        winner.value = currentPlayer.value === 'red' ? 'black' : 'red'
      }
    }

    const hasAnyLegalMove = () => {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const p = getPieceAt(r, c)
          if (p && p.color === (currentPlayer.value === 'red' ? RED : BLACK)) {
            if (getLegalMoves(p).length > 0) return true
          }
        }
      }
      return false
    }

    if (!hasAnyLegalMove() && !isCheck.value) {
      isGameOver.value = true
      winner.value = currentPlayer.value === 'red' ? 'black' : 'red'
    }
  }

  function undo() {
    if (moveHistory.value.length === 0 || isAIThinking.value) return

    const move = moveHistory.value.pop()!
    
    board.value[move.from.row][move.from.col] = { ...move.piece, position: { ...move.from } }
    if (move.captured) {
      board.value[move.to.row][move.to.col] = { ...move.captured, position: { ...move.to } }
    } else {
      board.value[move.to.row][move.to.col] = null
    }

    lastMove.value = moveHistory.value.length > 0 ? moveHistory.value[moveHistory.value.length - 1] : null
    currentPlayer.value = currentPlayer.value === 'red' ? 'black' : 'red'
    isCheck.value = false
    isCheckmate.value = false
    isGameOver.value = false
    winner.value = null
    selectedPos.value = null
    legalMoves.value = []
  }

  function reset() {
    board.value = JSON.parse(JSON.stringify(INITIAL_BOARD))
    currentPlayer.value = 'red'
    selectedPos.value = null
    legalMoves.value = []
    lastMove.value = null
    moveHistory.value = []
    isCheck.value = false
    isCheckmate.value = false
    isGameOver.value = false
    winner.value = null
    isAIThinking.value = false
  }

  function getPieceName(piece: Piece): string {
    return PIECE_NAMES[piece.type]
  }

  return {
    board,
    currentPlayer,
    selectedPos,
    legalMoves,
    lastMove,
    moveHistory,
    isCheck,
    isCheckmate,
    isGameOver,
    winner,
    isAIThinking,
    aiLevel,
    selectCell,
    makeMove,
    undo,
    reset,
    getPieceAt,
    getPieceName,
    getLegalMoves
  }
}

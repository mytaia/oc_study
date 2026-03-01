export type PlayerColor = 'red' | 'black'
export type PieceType = 'k' | 'a' | 'b' | 'n' | 'r' | 'c' | 'p'
export type PieceColor = 'r' | 'b'

export interface Position {
  row: number
  col: number
}

export interface Piece {
  type: PieceType
  color: PieceColor
  position: Position
}

export interface Move {
  from: Position
  to: Position
  piece: Piece
  captured?: Piece
}

export interface GameState {
  board: (Piece | null)[][]
  currentPlayer: PlayerColor
  selectedPos: Position | null
  legalMoves: Position[]
  lastMove: Move | null
  isCheck: boolean
  isCheckmate: boolean
  isGameOver: boolean
  winner: PlayerColor | null
}

export interface AIControl {
  id: number
  name: string
  level: number
}

export const PIECE_NAMES: Record<PieceType, string> = {
  k: '帥',
  a: '仕',
  b: '相',
  n: '馬',
  r: '車',
  c: '炮',
  p: '兵'
}

export const INITIAL_BOARD: (Piece | null)[][] = [
  [
    { type: 'r', color: 'r', position: { row: 0, col: 0 } },
    { type: 'n', color: 'r', position: { row: 0, col: 1 } },
    { type: 'b', color: 'r', position: { row: 0, col: 2 } },
    { type: 'a', color: 'r', position: { row: 0, col: 3 } },
    { type: 'k', color: 'r', position: { row: 0, col: 4 } },
    { type: 'a', color: 'r', position: { row: 0, col: 5 } },
    { type: 'b', color: 'r', position: { row: 0, col: 6 } },
    { type: 'n', color: 'r', position: { row: 0, col: 7 } },
    { type: 'r', color: 'r', position: { row: 0, col: 8 } }
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ],
  [
    null,
    { type: 'c', color: 'r', position: { row: 2, col: 1 } },
    null,
    null,
    null,
    null,
    null,
    { type: 'c', color: 'r', position: { row: 2, col: 7 } },
    null
  ],
  [
    { type: 'p', color: 'r', position: { row: 3, col: 0 } },
    null,
    { type: 'p', color: 'r', position: { row: 3, col: 2 } },
    null,
    { type: 'p', color: 'r', position: { row: 3, col: 4 } },
    null,
    { type: 'p', color: 'r', position: { row: 3, col: 6 } },
    null,
    { type: 'p', color: 'r', position: { row: 3, col: 8 } }
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ],
  [
    { type: 'p', color: 'b', position: { row: 6, col: 0 } },
    null,
    { type: 'p', color: 'b', position: { row: 6, col: 2 } },
    null,
    { type: 'p', color: 'b', position: { row: 6, col: 4 } },
    null,
    { type: 'p', color: 'b', position: { row: 6, col: 6 } },
    null,
    { type: 'p', color: 'b', position: { row: 6, col: 8 } }
  ],
  [
    null,
    { type: 'c', color: 'b', position: { row: 7, col: 1 } },
    null,
    null,
    null,
    null,
    null,
    { type: 'c', color: 'b', position: { row: 7, col: 7 } },
    null
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ],
  [
    { type: 'r', color: 'b', position: { row: 9, col: 0 } },
    { type: 'n', color: 'b', position: { row: 9, col: 1 } },
    { type: 'b', color: 'b', position: { row: 9, col: 2 } },
    { type: 'a', color: 'b', position: { row: 9, col: 3 } },
    { type: 'k', color: 'b', position: { row: 9, col: 4 } },
    { type: 'a', color: 'b', position: { row: 9, col: 5 } },
    { type: 'b', color: 'b', position: { row: 9, col: 6 } },
    { type: 'n', color: 'b', position: { row: 9, col: 7 } },
    { type: 'r', color: 'b', position: { row: 9, col: 8 } }
  ]
]

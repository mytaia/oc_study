<script setup lang="ts">
interface ChessGame {
  board: { value: any[][] }
  selectedPos: { value: { row: number; col: number } | null }
  legalMoves: { value: { row: number; col: number }[] }
  lastMove: { value: any | null }
  currentPlayer: { value: 'red' | 'black' }
  selectCell: (row: number, col: number) => void
}

const props = defineProps<{
  game: ChessGame
  isPlayerRed: boolean
}>()

const emit = defineEmits<{
  (e: 'piece-click', row: number, col: number): void
}>()

function isSelected(row: number, col: number): boolean {
  const displayRow = props.isPlayerRed ? row : 9 - row
  const displayCol = props.isPlayerRed ? col : 8 - col
  return props.game.selectedPos.value?.row === displayRow && props.game.selectedPos.value?.col === displayCol
}

function isLegalMove(row: number, col: number): boolean {
  const displayRow = props.isPlayerRed ? row : 9 - row
  const displayCol = props.isPlayerRed ? col : 8 - col
  return props.game.legalMoves.value.some(m => m.row === displayRow && m.col === displayCol)
}

function isLastMove(row: number, col: number): boolean {
  const displayRow = props.isPlayerRed ? row : 9 - row
  const displayCol = props.isPlayerRed ? col : 8 - col
  const last = props.game.lastMove.value
  if (!last) return false
  return (last.from.row === displayRow && last.from.col === displayCol) || 
         (last.to.row === displayRow && last.to.col === displayCol)
}

function getDisplayCoord(row: number, col: number): { row: number; col: number } {
  if (props.isPlayerRed) {
    return { row, col }
  }
  return { row: 9 - row, col: 8 - col }
}

function handleClick(row: number, col: number) {
  const actualRow = props.isPlayerRed ? row : 9 - row
  const actualCol = props.isPlayerRed ? col : 8 - col
  emit('piece-click', actualRow, actualCol)
}

const boardWidth = 520
const boardHeight = 580
const stepX = boardWidth / 8
const stepY = boardHeight / 9
</script>

<template>
  <div class="board-wrapper">
    <div class="board-container">
      <!-- 棋盘SVG层 -->
      <svg :viewBox="`0 0 ${boardWidth} ${boardHeight}`" class="board-svg">
        <!-- 棋盘底色 -->
        <rect x="0" y="0" :width="boardWidth" :height="boardHeight" fill="#f5f0e6"/>
        
        <!-- 外框 -->
        <rect x="2" y="2" :width="boardWidth - 4" :height="boardHeight - 4" 
              fill="none" stroke="#2c2c2c" stroke-width="3" rx="4"/>
        
        <!-- 竖线 - 上半部分(1-4行) -->
        <line v-for="i in 9" :key="'v-top'+i"
              :x1="(i-1) * stepX" :y1="0"
              :x2="(i-1) * stepX" :y2="stepY * 4"
              stroke="#2c2c2c" stroke-width="1.5"/>
        
        <!-- 竖线 - 下半部分(6-10行) -->
        <line v-for="i in 9" :key="'v-bottom'+i"
              :x1="(i-1) * stepX" :y1="stepY * 5"
              :x2="(i-1) * stepX" :y2="boardHeight"
              stroke="#2c2c2c" stroke-width="1.5"/>
        
        <!-- 10条横线 -->
        <line v-for="j in 10" :key="'h'+j"
              :x1="0" :y1="(j-1) * stepY"
              :x2="boardWidth" :y2="(j-1) * stepY"
              stroke="#2c2c2c" stroke-width="1.5"/>
        
        <!-- 楚河汉界 - 两条虚线 -->
        <line :x1="0" :y1="stepY * 4" :x2="boardWidth" :y2="stepY * 4"
              stroke="#2c2c2c" stroke-width="1.5" stroke-dasharray="8,6"/>
        <line :x1="0" :y1="stepY * 5" :x2="boardWidth" :y2="stepY * 5"
              stroke="#2c2c2c" stroke-width="1.5" stroke-dasharray="8,6"/>
        
        <!-- 上九宫斜线 -->
        <line :x1="stepX * 3" :y1="0" :x2="stepX * 5" :y2="stepY * 2"
              stroke="#2c2c2c" stroke-width="1.5"/>
        <line :x1="stepX * 5" :y1="0" :x2="stepX * 3" :y2="stepY * 2"
              stroke="#2c2c2c" stroke-width="1.5"/>
        
        <!-- 下九宫斜线 -->
        <line :x1="stepX * 3" :y1="stepY * 7" :x2="stepX * 5" :y2="stepY * 9"
              stroke="#2c2c2c" stroke-width="1.5"/>
        <line :x1="stepX * 5" :y1="stepY * 7" :x2="stepX * 3" :y2="stepY * 9"
              stroke="#2c2c2c" stroke-width="1.5"/>
        
        <!-- 楚河汉界文字 -->
        <text :x="stepX * 1.5" :y="stepY * 4.5" class="river-text">楚</text>
        <text :x="stepX * 2.8" :y="stepY * 4.5" class="river-text">河</text>
        <text :x="stepX * 5.2" :y="stepY * 4.5" class="river-text">漢</text>
        <text :x="stepX * 6.5" :y="stepY * 4.5" class="river-text">界</text>
      </svg>
      
      <!-- 棋子层 -->
      <div class="pieces-layer" :style="{ width: boardWidth + 'px', height: boardHeight + 'px' }">
        <template v-for="(row, rowIndex) in game.board.value" :key="rowIndex">
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex"
            class="cell"
            :style="{ 
              left: (getDisplayCoord(rowIndex, colIndex).col * stepX) + 'px',
              top: (getDisplayCoord(rowIndex, colIndex).row * stepY) + 'px'
            }"
            :class="{
              'selected': isSelected(rowIndex, colIndex),
              'legal-move': isLegalMove(rowIndex, colIndex),
              'last-move': isLastMove(rowIndex, colIndex)
            }"
            @click="handleClick(rowIndex, colIndex)"
          >
            <div 
              v-if="cell"
              class="piece"
              :class="{
                'red-piece': cell.color === 'r',
                'black-piece': cell.color === 'b'
              }"
            >
              <span class="piece-text" :class="{ 'red-text': cell.color === 'r', 'black-text': cell.color === 'b' }">
                {{ cell.type === 'k' ? (cell.color === 'r' ? '帥' : '將') : 
                   cell.type === 'a' ? '仕' :
                   cell.type === 'b' ? '相' :
                   cell.type === 'n' ? '馬' :
                   cell.type === 'r' ? '車' :
                   cell.type === 'c' ? '炮' : '兵' }}
              </span>
            </div>
            <div 
              v-if="isLegalMove(rowIndex, colIndex) && !cell" 
              class="move-dot"
            ></div>
            <div 
              v-if="isLegalMove(rowIndex, colIndex) && cell" 
              class="capture-hint"
            ></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
}

.board-container {
  position: relative;
  width: 520px;
  height: 580px;
  max-width: 90vw;
  max-height: 80vh;
  background: linear-gradient(145deg, #d4c4a8 0%, #b8a67a 100%);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3);
}

.board-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 520px;
  height: 580px;
}

.river-text {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 24px;
  fill: rgba(44, 44, 44, 0.15);
  text-anchor: middle;
  dominant-baseline: middle;
}

.pieces-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.cell {
  position: absolute;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  transform: translate(-50%, -50%);
}

.cell.selected {
  background: rgba(201, 76, 76, 0.15);
}

.cell.legal-move:hover {
  background: rgba(44, 44, 44, 0.08);
}

.cell.last-move::before {
  content: '';
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  background: rgba(201, 76, 76, 0.15);
}

.piece {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3), inset 0 2px 3px rgba(255, 255, 255, 0.3);
  transition: transform 0.15s ease;
}

.piece:hover {
  transform: scale(1.08);
}

.piece.red-piece {
  background: linear-gradient(145deg, #f8e8e8 0%, #e8d0d0 100%);
  border: 2px solid #c94c4c;
}

.piece.black-piece {
  background: linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 100%);
  border: 2px solid #1a1a1a;
}

.cell.selected .piece {
  box-shadow: 0 0 0 3px #c94c4c, 0 3px 6px rgba(0, 0, 0, 0.3), inset 0 2px 3px rgba(255, 255, 255, 0.3);
}

.piece-text {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 18px;
  font-weight: bold;
  user-select: none;
}

.red-text {
  color: #c94c4c;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
}

.black-text {
  color: #f5f0e6;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.move-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(44, 44, 44, 0.25);
}

.capture-hint {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid rgba(201, 76, 76, 0.5);
}
</style>

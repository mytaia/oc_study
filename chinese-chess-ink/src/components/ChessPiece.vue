<script setup lang="ts">
import { computed } from 'vue'
import type { Piece } from '@/types'
import { PIECE_NAMES } from '@/types'

const props = defineProps<{
  piece: Piece
  isSelected: boolean
  moveIndicator: 'from' | 'to' | null
  isPlayerRed: boolean
}>()

const isRed = computed(() => props.piece.color === 'r')
const isPlayerPiece = computed(() => {
  return props.isPlayerRed ? props.piece.color === 'r' : props.piece.color === 'b'
})

const pieceName = computed(() => PIECE_NAMES[props.piece.type])

const displayName = computed(() => {
  if (props.piece.type === 'k') {
    return isRed.value ? '帥' : '將'
  }
  return pieceName.value
})
</script>

<template>
  <div 
    class="piece"
    :class="{
      'red': isRed,
      'black': !isRed,
      'selected': isSelected,
      'player-piece': isPlayerPiece,
      'move-from': moveIndicator === 'from',
      'move-to': moveIndicator === 'to'
    }"
  >
    <div class="piece-inner">
      <span class="piece-text">{{ displayName }}</span>
    </div>
    <div class="piece-glow"></div>
  </div>
</template>

<style scoped>
.piece {
  width: 90%;
  height: 90%;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease;
  z-index: 5;
}

.piece:hover {
  transform: scale(1.08);
}

.piece.player-piece:hover {
  transform: scale(1.1);
}

.piece-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.3),
    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
}

.piece.red .piece-inner {
  background: linear-gradient(145deg, #f8e8e8 0%, #e8d0d0 100%);
  border: 2px solid #c94c4c;
}

.piece.black .piece-inner {
  background: linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 100%);
  border: 2px solid #1a1a1a;
}

.piece-text {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: clamp(14px, 4vw, 24px);
  font-weight: bold;
  user-select: none;
}

.piece.red .piece-text {
  color: #c94c4c;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
}

.piece.black .piece-text {
  color: #f5f0e6;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.piece.selected .piece-inner {
  box-shadow: 
    0 0 0 3px #c94c4c,
    0 4px 8px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
}

.piece.move-from .piece-inner {
  animation: moveFrom 0.5s ease;
}

.piece.move-to .piece-inner {
  animation: moveTo 0.5s ease;
}

@keyframes moveFrom {
  0% { transform: scale(1); }
  50% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

@keyframes moveTo {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.piece-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.piece.selected .piece-glow {
  opacity: 1;
  background: radial-gradient(circle, rgba(201, 76, 76, 0.3) 0%, transparent 70%);
  animation: glow 1.5s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
</style>

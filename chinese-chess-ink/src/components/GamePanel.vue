<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSound } from '@/composables/useSound'

interface GameState {
  currentPlayer: { value: 'red' | 'black' }
  isCheck: { value: boolean }
  isAIThinking: { value: boolean }
  moveHistory: { value: any[] }
}

const props = defineProps<{
  game: GameState
  gameMode: 'pvp' | 'pve'
  isPlayerRed: boolean
}>()

const emit = defineEmits<{
  (e: 'undo'): void
  (e: 'reset'): void
}>()

const sound = useSound()
const aiLevel = ref(2)
const showMoves = ref(false)

const currentTurnText = computed(() => {
  if (props.game.isCheck.value) {
    return '将军！'
  }
  const isRedTurn = props.game.currentPlayer.value === 'red'
  const isPlayerTurn = props.isPlayerRed ? isRedTurn : !isRedTurn
  
  if (props.gameMode === 'pve' && !isPlayerTurn) {
    return 'AI思考中...'
  }
  return isRedTurn ? '红方回合' : '黑方回合'
})

const turnColor = computed(() => {
  return props.game.currentPlayer.value === 'red' ? 'red' : 'black'
})

const canUndo = computed(() => {
  if (props.gameMode === 'pve') {
    return props.game.moveHistory.value.length > 0 && !props.game.isAIThinking.value
  }
  return props.game.moveHistory.value.length > 0
})

function handleUndo() {
  sound.playClick()
  emit('undo')
}

function handleReset() {
  sound.playClick()
  emit('reset')
}

function setLevel(level: number) {
  sound.playClick()
  aiLevel.value = level
}
</script>

<template>
  <div class="game-panel">
    <div class="status-bar">
      <div class="turn-indicator" :class="[turnColor, { 'thinking': game.isAIThinking.value }]">
        <span class="turn-icon">{{ turnColor === 'red' ? '帥' : '將' }}</span>
        <span class="turn-text">{{ currentTurnText }}</span>
      </div>
    </div>
    
    <div class="controls">
      <button 
        class="control-btn" 
        :disabled="!canUndo"
        @click="handleUndo"
      >
        <span class="btn-icon">&#x21B6;</span>
        <span class="btn-label">悔棋</span>
      </button>
      
      <button 
        v-if="gameMode === 'pve'"
        class="control-btn level-btn"
        @click="showMoves = !showMoves"
      >
        <span class="btn-icon">&#x2699;</span>
        <span class="btn-label">难度 {{ aiLevel }}</span>
      </button>
      
      <button class="control-btn" @click="handleReset">
        <span class="btn-icon">&#x21BB;</span>
        <span class="btn-label">重置</span>
      </button>
    </div>
    
    <div v-if="showMoves && gameMode === 'pve'" class="level-selector">
      <button 
        v-for="level in [1, 2, 3]" 
        :key="level"
        class="level-option"
        :class="{ active: aiLevel === level }"
        @click="setLevel(level)"
      >
        {{ level === 1 ? '入门' : level === 2 ? '进阶' : '大师' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.game-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 400px;
}

.status-bar {
  width: 100%;
}

.turn-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 24px;
  border-radius: 24px;
  background: rgba(44, 44, 44, 0.06);
  transition: all 0.3s ease;
}

.turn-indicator.red {
  border: 2px solid rgba(201, 76, 76, 0.3);
}

.turn-indicator.black {
  border: 2px solid rgba(44, 44, 44, 0.2);
}

.turn-indicator.thinking {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.turn-icon {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 24px;
}

.turn-indicator.red .turn-icon {
  color: #c94c4c;
}

.turn-indicator.black .turn-icon {
  color: #2c2c2c;
}

.turn-text {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 16px;
  color: #2c2c2c;
}

.controls {
  display: flex;
  gap: 12px;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: rgba(44, 44, 44, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.control-btn:hover:not(:disabled) {
  background: rgba(44, 44, 44, 0.15);
  transform: translateY(-2px);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-btn.level-btn {
  background: rgba(201, 76, 76, 0.1);
}

.control-btn.level-btn:hover:not(:disabled) {
  background: rgba(201, 76, 76, 0.2);
}

.btn-icon {
  font-size: 20px;
}

.btn-label {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 13px;
  color: #2c2c2c;
}

.level-selector {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(44, 44, 44, 0.04);
  border-radius: 12px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.level-option {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.level-option:hover {
  background: rgba(44, 44, 44, 0.08);
}

.level-option.active {
  background: #c94c4c;
  color: #f5f0e6;
}
</style>

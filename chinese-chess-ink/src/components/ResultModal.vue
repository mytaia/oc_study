<script setup lang="ts">
import { computed } from 'vue'
import { useSound } from '@/composables/useSound'

const props = defineProps<{
  winner: 'red' | 'black' | null
  isPlayerRed: boolean
}>()

const emit = defineEmits<{
  (e: 'restart'): void
  (e: 'back'): void
}>()

const sound = useSound()

const resultText = computed(() => {
  if (!props.winner) return ''
  const playerWon = (props.isPlayerRed && props.winner === 'red') || 
                    (!props.isPlayerRed && props.winner === 'black')
  return playerWon ? '恭喜获胜！' : '再接再厉'
})

const resultEmoji = computed(() => {
  if (!props.winner) return ''
  const playerWon = (props.isPlayerRed && props.winner === 'red') || 
                    (!props.isPlayerRed && props.winner === 'black')
  return playerWon ? '&#x1F389;' : '&#x1F4AA;'
})

function handleRestart() {
  sound.playClick()
  emit('restart')
}

function handleBack() {
  sound.playClick()
  emit('back')
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <div class="result-icon" v-html="resultEmoji"></div>
      
      <h2 class="result-title">{{ resultText }}</h2>
      
      <p class="result-detail">
        {{ winner === 'red' ? '红方' : '黑方' }}获胜
      </p>
      
      <div class="actions">
        <button class="action-btn primary" @click="handleRestart">
          再来一局
        </button>
        <button class="action-btn" @click="handleBack">
          返回菜单
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: linear-gradient(145deg, #f5f0e6 0%, #e8e0d0 100%);
  border-radius: 24px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 320px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-icon {
  font-size: 64px;
  animation: bounce 0.6s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.result-title {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 32px;
  color: #2c2c2c;
  margin: 0;
}

.result-detail {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 16px;
  color: #666;
  margin: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 16px;
}

.action-btn {
  width: 100%;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(44, 44, 44, 0.08);
  color: #2c2c2c;
}

.action-btn:hover {
  background: rgba(44, 44, 44, 0.15);
  transform: translateY(-2px);
}

.action-btn.primary {
  background: linear-gradient(145deg, #c94c4c 0%, #a33 100%);
  color: #f5f0e6;
  box-shadow: 0 4px 16px rgba(201, 76, 76, 0.3);
}

.action-btn.primary:hover {
  box-shadow: 0 6px 20px rgba(201, 76, 76, 0.4);
}
</style>

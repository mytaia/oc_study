<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import ChessBoard from './components/ChessBoard.vue'
import GamePanel from './components/GamePanel.vue'
import StartScreen from './components/StartScreen.vue'
import ResultModal from './components/ResultModal.vue'
import { useGame } from './composables/useGame'
import { useAI } from './composables/useAI'
import { useSound } from './composables/useSound'

const gameMode = ref<'menu' | 'pvp' | 'pve'>('menu')
const playerColor = ref<'red' | 'black'>('red')
const game = useGame()
const ai = useAI(game)
const sound = useSound()

const isPlayerRed = computed(() => playerColor.value === 'red')

watch(() => game.currentPlayer.value, (newPlayer) => {
  if (gameMode.value === 'pve') {
    const playerColorTurn = playerColor.value === 'red' ? 'red' : 'black'
    if (newPlayer !== playerColorTurn) {
      ai.makeAIMove()
    }
  }
})

watch(() => game.lastMove.value, (newMove) => {
  if (newMove) {
    if (newMove.captured) {
      sound.playCapture()
    } else {
      sound.playMove()
    }
  }
})

watch(() => game.isCheck.value, (checked) => {
  if (checked) {
    sound.playCheck()
  }
})

watch(() => game.isGameOver.value, (over) => {
  if (over) {
    if (game.winner.value === 'red') {
      if (isPlayerRed.value) {
        sound.playVictory()
      } else {
        sound.playDefeat()
      }
    } else {
      if (!isPlayerRed.value) {
        sound.playVictory()
      } else {
        sound.playDefeat()
      }
    }
  }
})

function startGame(mode: 'pvp' | 'pve', color: 'red' | 'black') {
  sound.playClick()
  game.reset()
  gameMode.value = mode
  playerColor.value = color
  
  if (mode === 'pve' && color === 'black') {
    setTimeout(() => {
      ai.makeAIMove()
    }, 500)
  }
}

function backToMenu() {
  sound.playClick()
  game.reset()
  gameMode.value = 'menu'
}
</script>

<template>
  <div class="app">
    <div class="background">
      <div class="ink-pattern"></div>
    </div>
    
    <StartScreen 
      v-if="gameMode === 'menu'" 
      @start="startGame"
    />
    
    <template v-else>
      <header class="header">
        <button class="back-btn" @click="backToMenu">
          <span class="icon">←</span>
        </button>
        <h1 class="title">水墨象棋</h1>
        <button class="sound-btn" @click="sound.toggleSounds">
          <span v-if="sound.soundsEnabled.value">🔊</span>
          <span v-else>🔇</span>
        </button>
      </header>
      
      <main class="main">
        <ChessBoard 
          :game="game"
          :is-player-red="isPlayerRed"
          @piece-click="(row: number, col: number) => game.selectCell(row, col)"
        />
        
        <GamePanel 
          :game="game"
          :game-mode="gameMode"
          :is-player-red="isPlayerRed"
          @undo="game.undo()"
          @reset="game.reset()"
        />
      </main>
      
      <ResultModal 
        v-if="game.isGameOver.value"
        :winner="game.winner.value"
        :is-player-red="isPlayerRed"
        @restart="game.reset()"
        @back="backToMenu"
      />
    </template>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #f5f0e6 0%, #e8e0d0 100%);
}

.background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ink-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5c-1 5-5 10-10 10s-10 5-10 10 5 10 10 10 10 5 10 10 5-5 10-10 10-5 10-10-5-10-10-10-10-5-10-10z' fill='%23000' fill-opacity='1'/%3E%3C/svg%3E");
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  position: relative;
  z-index: 10;
}

.back-btn, .sound-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(44, 44, 44, 0.08);
  color: #2c2c2c;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.back-btn:hover, .sound-btn:hover {
  background: rgba(44, 44, 44, 0.15);
  transform: scale(1.05);
}

.title {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 28px;
  color: #2c2c2c;
  letter-spacing: 4px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 20px;
  position: relative;
  z-index: 10;
}

@media (min-width: 768px) {
  .header {
    padding: 24px 40px;
  }
  
  .title {
    font-size: 36px;
  }
  
  .main {
    gap: 32px;
  }
}
</style>

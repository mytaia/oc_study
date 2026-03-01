<script setup lang="ts">
import { ref } from 'vue'
import { useSound } from '@/composables/useSound'

const emit = defineEmits<{
  (e: 'start', mode: 'pvp' | 'pve', playerColor: 'red' | 'black'): void
}>()

const sound = useSound()
const selectedMode = ref<'pvp' | 'pve' | null>(null)
const selectedColor = ref<'red' | 'black'>('red')

function handleModeSelect(mode: 'pvp' | 'pve') {
  sound.playClick()
  selectedMode.value = mode
}

function handleColorSelect(color: 'red' | 'black') {
  sound.playClick()
  selectedColor.value = color
}

function handleStart() {
  sound.playClick()
  if (selectedMode.value) {
    emit('start', selectedMode.value, selectedColor.value)
  }
}

function handleBack() {
  sound.playClick()
  selectedMode.value = null
}
</script>

<template>
  <div class="start-screen">
    <div class="content" v-if="!selectedMode">
      <div class="logo">
        <div class="chess-icon">
          <span>車</span>
        </div>
      </div>
      
      <h1 class="title">水墨象棋</h1>
      <p class="subtitle">Ink Wash Chinese Chess</p>
      
      <div class="menu">
        <button class="menu-btn primary" @click="handleModeSelect('pve')">
          <span class="btn-icon">🤖</span>
          <span class="btn-text">人机对战</span>
          <span class="btn-sub">挑战AI</span>
        </button>
        
        <button class="menu-btn" @click="handleModeSelect('pvp')">
          <span class="btn-icon">👥</span>
          <span class="btn-text">双人对战</span>
          <span class="btn-sub">本地博弈</span>
        </button>
      </div>
      
      <div class="decoration">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>

    <div class="content" v-else>
      <h2 class="mode-title">
        {{ selectedMode === 'pve' ? '人机对战' : '双人对战' }}
      </h2>
      
      <div class="color-select" v-if="selectedMode === 'pve'">
        <p class="select-label">请选择你的阵营</p>
        <div class="color-options">
          <button 
            class="color-btn red" 
            :class="{ active: selectedColor === 'red' }"
            @click="handleColorSelect('red')"
          >
            <span class="color-icon">帥</span>
            <span class="color-text">红方</span>
            <span class="color-desc">先手</span>
          </button>
          <button 
            class="color-btn black" 
            :class="{ active: selectedColor === 'black' }"
            @click="handleColorSelect('black')"
          >
            <span class="color-icon">將</span>
            <span class="color-text">黑方</span>
            <span class="color-desc">后手</span>
          </button>
        </div>
      </div>

      <div class="difficulty-select" v-if="selectedMode === 'pve'">
        <p class="select-label">选择难度</p>
        <div class="difficulty-options">
          <button class="difficulty-btn">入门</button>
          <button class="difficulty-btn active">进阶</button>
          <button class="difficulty-btn">大师</button>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="action-btn primary" @click="handleStart">
          开始游戏
        </button>
        <button class="action-btn" @click="handleBack">
          返回
        </button>
      </div>
    </div>
    
    <div class="background-decor">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
    </div>
  </div>
</template>

<style scoped>
.start-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 10;
}

.logo {
  margin-bottom: 8px;
}

.chess-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(145deg, #f5f0e6 0%, #d4c4a8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(255, 255, 255, 0.5);
  animation: float 3s ease-in-out infinite;
}

.chess-icon span {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 48px;
  color: #c94c4c;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.title {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 48px;
  color: #2c2c2c;
  letter-spacing: 8px;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 14px;
  color: #666;
  letter-spacing: 2px;
  margin: -16px 0 8px;
}

.mode-title {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 32px;
  color: #2c2c2c;
  margin: 0;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.menu-btn {
  width: 240px;
  padding: 16px 32px;
  border: none;
  border-radius: 16px;
  background: rgba(44, 44, 44, 0.08);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.menu-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(255,255,255,0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.menu-btn:hover::before {
  opacity: 1;
}

.menu-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.menu-btn.primary {
  background: linear-gradient(145deg, #c94c4c 0%, #a33 0%);
  box-shadow: 0 4px 16px rgba(201, 76, 76, 0.3);
}

.menu-btn.primary:hover {
  box-shadow: 0 8px 24px rgba(201, 76, 76, 0.4);
}

.btn-icon {
  font-size: 28px;
}

.btn-text {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 18px;
  color: #2c2c2c;
}

.menu-btn.primary .btn-text {
  color: #f5f0e6;
}

.btn-sub {
  font-size: 12px;
  color: #666;
}

.menu-btn.primary .btn-sub {
  color: rgba(245, 240, 230, 0.8);
}

.select-label {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.color-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.color-options {
  display: flex;
  gap: 20px;
}

.color-btn {
  width: 120px;
  padding: 16px;
  border: 2px solid rgba(44, 44, 44, 0.1);
  border-radius: 16px;
  background: rgba(44, 44, 44, 0.04);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.color-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.color-btn.red.active {
  border-color: #c94c4c;
  background: rgba(201, 76, 76, 0.1);
}

.color-btn.black.active {
  border-color: #2c2c2c;
  background: rgba(44, 44, 44, 0.1);
}

.color-icon {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 32px;
}

.color-btn.red .color-icon {
  color: #c94c4c;
}

.color-btn.black .color-icon {
  color: #2c2c2c;
}

.color-text {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 16px;
  color: #2c2c2c;
}

.color-desc {
  font-size: 12px;
  color: #999;
}

.difficulty-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.difficulty-options {
  display: flex;
  gap: 8px;
}

.difficulty-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: rgba(44, 44, 44, 0.08);
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.difficulty-btn:hover {
  background: rgba(44, 44, 44, 0.15);
}

.difficulty-btn.active {
  background: #c94c4c;
  color: #f5f0e6;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.action-btn {
  width: 200px;
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

.decoration {
  display: flex;
  gap: 8px;
  margin-top: 32px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2c2c2c;
  opacity: 0.2;
}

.dot:nth-child(2) {
  animation: blink 1.5s ease-in-out infinite;
}

.dot:nth-child(3) {
  animation: blink 1.5s ease-in-out 0.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.6; }
}

.background-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(44, 44, 44, 0.05);
}

.c1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
}

.c2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}

.c3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 10%;
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

import { ref } from 'vue'

export function useSound() {
  const soundsEnabled = ref(true)
  
  const audioContext = ref<AudioContext | null>(null)

  function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!soundsEnabled.value) return
    
    try {
      if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioContext.value
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = type
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      console.warn('Audio playback failed:', e)
    }
  }

  function playMove() {
    playTone(800, 0.1)
  }

  function playCapture() {
    playTone(400, 0.15, 'square')
    setTimeout(() => playTone(300, 0.15, 'square'), 100)
  }

  function playCheck() {
    playTone(1000, 0.1)
    setTimeout(() => playTone(1200, 0.1), 100)
    setTimeout(() => playTone(1400, 0.2), 200)
  }

  function playVictory() {
    const notes = [523, 587, 659, 698]
    notes.forEach((note, i) => {
      setTimeout(() => playTone(note, 0.3), i * 150)
    })
  }

  function playDefeat() {
    const notes = [392, 349, 330, 294]
    notes.forEach((note, i) => {
      setTimeout(() => playTone(note, 0.3), i * 150)
    })
  }

  function playClick() {
    playTone(600, 0.05)
  }

  function toggleSounds() {
    soundsEnabled.value = !soundsEnabled.value
    if (soundsEnabled.value) {
      playClick()
    }
  }

  return {
    soundsEnabled,
    playMove,
    playCapture,
    playCheck,
    playVictory,
    playDefeat,
    playClick,
    toggleSounds
  }
}

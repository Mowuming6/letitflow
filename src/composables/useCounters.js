import { ref } from 'vue'

const peopleCount = ref(null)
const decisionCount = ref(null)
let initialized = false

const API = import.meta.env.VITE_COUNTER_API || '/api/counters'

function countUp(target, setter, duration = 1500) {
  const start = Math.floor(target * 0.88)
  const startTime = performance.now()
  function step(now) {
    const p = Math.min(1, (now - startTime) / duration)
    const ease = 1 - Math.pow(1 - p, 3)
    setter(Math.round(start + (target - start) * ease))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export async function initCounters() {
  if (initialized) return
  initialized = true
  try {
    const res = await fetch(API, { method: 'GET' })
    if (!res.ok) return
    const data = await res.json()
    if (typeof data.people === 'number') countUp(data.people, v => { peopleCount.value = v })
    if (typeof data.decisions === 'number') countUp(data.decisions, v => { decisionCount.value = v })
  } catch (e) {
    peopleCount.value = 66
    decisionCount.value = 166
  }
}

export async function trackDecision() {
  if (decisionCount.value !== null) decisionCount.value += 1
  try {
    const res = await fetch(`${API}?type=decision`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (typeof data.people === 'number') peopleCount.value = data.people
    if (typeof data.decisions === 'number') decisionCount.value = data.decisions
  } catch (e) {}
}

export function useCounters() {
  return { peopleCount, decisionCount, initCounters, trackDecision }
}

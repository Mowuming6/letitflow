import { ref } from 'vue'

// 全局共享计数器（Cloudflare Pages Functions + KV）
// - people：打开网页人数，基础 66，每次打开网页 +1
// - decisions：占卜决策次数，基础 166，每次使用任意占卜 +1
// 后端接口：GET  /api/counters        -> 人数 +1，返回 { people, decisions }
//          POST /api/counters?type=decision -> 决策 +1，返回 { people, decisions }
// 本地开发或后端不可用时，自动回退到基础数，不影响页面展示。

const BASE_PEOPLE = 66
const BASE_DECISIONS = 166

const peopleCount = ref(BASE_PEOPLE)
const decisionCount = ref(BASE_DECISIONS)
let initialized = false

// 可通过 VITE_COUNTER_API 指向独立 Worker 地址；默认走同域 Pages Function
const API = import.meta.env.VITE_COUNTER_API || '/api/counters'

export async function initCounters() {
  if (initialized) return
  initialized = true
  try {
    const res = await fetch(API, { method: 'GET' })
    if (!res.ok) return
    const data = await res.json()
    if (typeof data.people === 'number') peopleCount.value = data.people
    if (typeof data.decisions === 'number') decisionCount.value = data.decisions
  } catch (e) {
    // 离线 / 未部署后端：保留基础数，不阻塞页面
  }
}

export async function trackDecision() {
  // 乐观更新：先本地 +1，保证离线也有反馈；随后用服务端返回值校准
  decisionCount.value += 1
  try {
    const res = await fetch(`${API}?type=decision`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (typeof data.people === 'number') peopleCount.value = data.people
    if (typeof data.decisions === 'number') decisionCount.value = data.decisions
  } catch (e) {
    // 失败保留本地乐观值
  }
}

export function useCounters() {
  return { peopleCount, decisionCount, initCounters, trackDecision }
}

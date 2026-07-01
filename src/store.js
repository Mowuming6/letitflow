import { reactive } from 'vue'
import { THEMES, buildThemeStyle } from './theme.js'

function formatTime(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

const savedTheme = localStorage.getItem('app_theme') || 'jin'
const savedHistory = JSON.parse(localStorage.getItem('divination_history') || '[]')
const savedAiMessages = JSON.parse(localStorage.getItem('ai_messages_history') || '[]')

export const store = reactive({
  themeKey: savedTheme,
  isDark: localStorage.getItem('app_is_dark') === 'true',
  isGesture: localStorage.getItem('app_is_gesture') === 'true',
  history: savedHistory,
  aiMessages: savedAiMessages,
  aiSystemPrompt: localStorage.getItem('ai_system_prompt') || '',
  aiQuota: JSON.parse(localStorage.getItem('ai_quota') || 'null') || { remaining: null, limit: null, day: null },

  setDark(val) {
    this.isDark = val
    localStorage.setItem('app_is_dark', val)
  },

  setGesture(val) {
    this.isGesture = val
    localStorage.setItem('app_is_gesture', val)
  },

  getThemeStyle() {
    return buildThemeStyle(this.themeKey)
  },

  getThemeIconDir() {
    const t = THEMES[this.themeKey] || THEMES.jin
    return t.iconDir
  },

  getThemeCardBack() {
    return `/images/themes/${this.themeKey}/card.jpg`
  },

  setTheme(key) {
    if (!THEMES[key]) return
    this.themeKey = key
    localStorage.setItem('app_theme', key)
  },

  saveHistory(type, result, desc) {
    const record = {
      id: Date.now(),
      type,
      result,
      desc,
      timeStr: formatTime(new Date()),
    }
    this.history.unshift(record)
    if (this.history.length > 100) this.history = this.history.slice(0, 100)
    localStorage.setItem('divination_history', JSON.stringify(this.history))
    return record
  },

  getHistory() {
    return this.history || []
  },

  clearHistory() {
    this.history = []
    localStorage.removeItem('divination_history')
  },

  // ─── AI Dialogue Global Actions ───
  addAiMessage(sender, text, pageType = '', isInterpretation = false) {
    const msg = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      sender, // 'user' | 'ai' | 'system'
      text,
      timeStr: formatTime(new Date()),
      pageType, // e.g. 'qian', 'tarot'
      isInterpretation // 是否为系统初次解读
    }
    this.aiMessages.push(msg)
    // 限制最近 200 条消息，防止 LocalStorage 撑爆
    if (this.aiMessages.length > 200) {
      this.aiMessages.shift()
    }
    localStorage.setItem('ai_messages_history', JSON.stringify(this.aiMessages))
  },

  clearAiHistory() {
    this.aiMessages = []
    localStorage.removeItem('ai_messages_history')
  },

  saveSystemPrompt(prompt) {
    this.aiSystemPrompt = prompt
    localStorage.setItem('ai_system_prompt', prompt)
  },

  setAiQuota(quota) {
    this.aiQuota = quota || { remaining: null, limit: null, day: null }
    localStorage.setItem('ai_quota', JSON.stringify(this.aiQuota))
  }
})

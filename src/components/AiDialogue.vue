<template>
  <div class="ai-wrapper" ref="aiSectionRef">
    <!-- 入口及展开按钮面板（当对话框收起时显示） -->
    <div v-if="!showChat" class="ai-trigger-panel">
      <!-- 显眼的“AI 智能解读”按钮：仅在占卜结果出来、且当前会话还没进行过解读时显示 -->
      <div v-if="hasResult && !sessionInterpreted" class="ai-prominent-row fade-in">
        <button class="ai-action-btn btn-interpret" @click="startInterpretation">
          <span class="btn-icon">✨</span> AI 智能解读
        </button>
      </div>

      <!-- 常驻低调的“展开 AI 对话”按钮：风格参考收起按钮，极其克制，任何阶段（包括洗牌、未占卜时）都可用 -->
      <div class="ai-subtle-row fade-in">
        <button class="ai-subtle-expand-btn" @click="openDirectChat">
          ▼ 展开 AI 对话
        </button>
      </div>
    </div>

    <!-- 核心 AI 交互聊天面板 -->
    <div v-if="showChat" class="ai-chat-panel fade-in">
      <div class="ai-panel-header">
        <div class="ai-header-title">
          <img class="ai-avatar-icon animate-spin-slow" :src="logoSrc" @error="fallbackLogo" />
          <span class="ai-header-name">AI 解读助手</span>
        </div>
        <div class="ai-header-actions">
          <button class="ai-clear-btn" @click="confirmClearHistory" title="清空对话历史">🧹 清空历史</button>
        </div>
      </div>

      <!-- 对话消息列表 -->
      <div class="ai-message-list" ref="messageListRef">
        <!-- 引导语 -->
        <div class="message-row ai">
          <div class="avatar-wrap">
            <img class="avatar" :src="logoSrc" @error="fallbackLogo" />
          </div>
          <div class="bubble ai-bubble">
            你好，我是你的专属 AI 占卜助手。我已经感知到了你当下的起心动念。你可以点击上方按钮让我为你进行深度解读，或者直接在此处向我提问。
          </div>
        </div>

        <!-- 聊天历史渲染 -->
        <div v-for="msg in filteredHistory" :key="msg.id" class="message-row" :class="msg.sender">
          <div v-if="msg.sender === 'ai'" class="avatar-wrap">
            <img class="avatar" :src="logoSrc" @error="fallbackLogo" />
          </div>
          <div class="bubble" :class="msg.sender === 'ai' ? 'ai-bubble' : 'user-bubble'">
            <!-- 支持Markdown基本加粗等样式 -->
            <div class="msg-content" v-html="formatMessageText(msg.text)"></div>
            <div class="msg-time">{{ msg.timeStr.split(' ')[1] || msg.timeStr }}</div>
          </div>
          <div v-if="msg.sender === 'user'" class="avatar-wrap user-avatar">
            {{ userAvatarName }}
          </div>
        </div>

        <!-- 打字机动画中的临时模拟回复消息 -->
        <div v-if="isTyping" class="message-row ai">
          <div class="avatar-wrap">
            <img class="avatar" :src="logoSrc" @error="fallbackLogo" />
          </div>
          <div class="bubble ai-bubble">
            <div class="msg-content" v-html="formatMessageText(typingText)"></div>
            <span class="cursor-blink">|</span>
          </div>
        </div>

        <!-- 模拟正在思考的 Loading 状态 -->
        <div v-if="isLoading" class="message-row ai">
          <div class="avatar-wrap">
            <img class="avatar" :src="logoSrc" @error="fallbackLogo" />
          </div>
          <div class="bubble ai-bubble loading-bubble">
            <div class="dot-flashing"></div>
          </div>
        </div>
      </div>

      <!-- 展开状态下：有结果、未解读时的内联快捷解读横幅 -->
      <div v-if="hasResult && !sessionInterpreted" class="ai-inline-interpret-banner fade-in">
        <span class="ai-banner-text">🔮 已求得新结果，需要进行深度解读吗？</span>
        <button class="mini-interpret-btn" @click="startInterpretation" :disabled="isLoading || isTyping">
          ✨ 智能解读
        </button>
      </div>

      <!-- 消息输入区域 -->
      <div class="ai-input-bar">
        <input
          class="ai-input"
          v-model="userInput"
          placeholder="追问AI占卜师...（如：有什么需要注意的吗？）"
          @keyup.enter="sendMessage"
          :disabled="isTyping || isLoading"
        />
        <button
          class="ai-send-btn"
          @click="sendMessage"
          :disabled="!userInput.trim() || isTyping || isLoading"
        >
          发送
        </button>
      </div>
    </div>

    <!-- 展开后的收起按钮行 -->
    <div v-if="showChat" class="ai-collapse-row fade-in">
      <button class="ai-collapse-btn" @click="collapseChat">
        ▲ 收起 AI 对话
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { store } from '../store.js'
import {
  buildInterpretationPrompt
} from '../utils/aiPrompts.js'

const props = defineProps({
  pageType: { type: String, required: true }, // 'qian' | 'liuyao' | 'plum' | 'tarot' | 'lenormand'
  question: { type: String, default: '' },   // 界面顶部的输入框问题
  resultData: { type: [Object, Array], required: true }, // 当前页面的占卜结果
  hasResult: { type: Boolean, default: false } // 占卜是否已完成且有结果
})

const aiSectionRef = ref(null)
const messageListRef = ref(null)

const showChat = ref(false)
const userInput = ref('')
const isLoading = ref(false)
const isTyping = ref(false)
const typingText = ref('')

// 获取当前主题对应的LOGO
const logoSrc = computed(() => {
  return `/images/themes/${store.themeKey}/LOGO.png`
})

// 默认LOGO图，如果找不到图片就降级
const fallbackLogo = (e) => {
  e.target.src = '/images/LOGO.png'
}

// 用户头像缩写名字
const userAvatarName = computed(() => {
  return props.question ? props.question.trim().charAt(0) : '问'
})

// 过滤后的聊天记录
const filteredHistory = computed(() => {
  return store.aiMessages || []
})

// 本轮是否已完成一次“智能解读”（用于控制按钮显示）
const sessionInterpreted = ref(false)

// 格式化文本
function formatMessageText(text) {
  if (!text) return ''
  let formatted = text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/✨/g, '✨')
    .replace(/☯️/g, '☯️')
    .replace(/🌸/g, '🌸')
    .replace(/🃏/g, '🃏')
    .replace(/🎴/g, '🎴')
  return formatted
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 自动滚动定位整个AI组件进入视野
function scrollComponentIntoView() {
  nextTick(() => {
    setTimeout(() => {
      if (aiSectionRef.value) {
        aiSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 150)
  })
}

// 收起对话框
function collapseChat() {
  showChat.value = false
}

// 清空历史对话确认
function confirmClearHistory() {
  if (confirm('确定要清空与 AI 占卜师的所有对话历史吗？')) {
    store.clearAiHistory()
  }
}

// 开启直达 AI 对话
function openDirectChat() {
  showChat.value = true
  scrollComponentIntoView()
  scrollToBottom()
}

function makeClientMessages() {
  // store.aiMessages uses sender: 'user'|'ai'
  // Only send last 10 messages of this pageType to the server.
  const msgs = (store.aiMessages || [])
    .filter(m => m.pageType === props.pageType)
    .slice(-10)
    .map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))
  return msgs
}

async function streamFromApi({ mode }) {
  const payload = {
    pageType: props.pageType,
    question: props.question,
    resultData: props.resultData,
    mode,
    messages: (() => {
      const base = makeClientMessages()
      if (mode === 'interpretation') {
        base.push({ role: 'user', content: '请对本次占卜结果进行一次深度解读。' })
      }
      return base
    })(),
  }

  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(async () => {
      const text = await resp.text().catch(() => '')
      return text ? { error: text } : null
    })
    const msg = err?.message || err?.error || `请求失败(${resp.status})`
    throw new Error(msg)
  }

  if (!resp.body) {
    throw new Error('服务端未返回流式数据')
  }

  // Parse SSE
  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let aiText = ''

  isTyping.value = true
  typingText.value = ''

  const flushTyping = () => {
    typingText.value = aiText
    scrollToBottom()
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const lines = chunk.split('\n')
      let eventName = null
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
      }

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5)
        const dataTrim = data.trimStart()

        if (eventName === 'meta') {
          try {
            const meta = JSON.parse(dataTrim)
            store.setAiQuota(meta)
          } catch {}
          continue
        }

        if (eventName === 'done') {
          // done payload might include remaining
          try {
            const meta = JSON.parse(dataTrim)
            store.setAiQuota(meta)
          } catch {}
          continue
        }

        // default event: plain text piece
        aiText += dataTrim
        flushTyping()
      }
    }
  }

  isTyping.value = false
  typingText.value = ''
  return aiText
}

// 开始 AI 智能解读
async function startInterpretation() {
  showChat.value = true
  isLoading.value = true
  sessionInterpreted.value = true
  scrollComponentIntoView()
  scrollToBottom()

  try {
    // Keep original prompt builder for logging/debug; actual prompt is built server-side.
    const fullPrompt = buildInterpretationPrompt(props.pageType, props.question, props.resultData)
    console.log('Constructed Prompt for AI:', fullPrompt)

    const text = await streamFromApi({ mode: 'interpretation' })
    isLoading.value = false
    store.addAiMessage('ai', text, props.pageType, true)
    scrollToBottom()
  } catch (e) {
    isLoading.value = false
    isTyping.value = false
    typingText.value = ''
    store.addAiMessage('ai', `⚠️ ${e.message || e}`, props.pageType)
    scrollToBottom()
  }
}

// 用户发送追问消息
async function sendMessage() {
  if (!userInput.value.trim() || isTyping.value || isLoading.value) return

  const userQuery = userInput.value.trim()
  userInput.value = ''

  store.addAiMessage('user', userQuery, props.pageType)
  scrollToBottom()

  isLoading.value = true

  try {
    const text = await streamFromApi({ mode: 'chat' })
    isLoading.value = false
    store.addAiMessage('ai', text, props.pageType)
    scrollToBottom()
  } catch (e) {
    isLoading.value = false
    isTyping.value = false
    typingText.value = ''
    store.addAiMessage('ai', `⚠️ ${e.message || e}`, props.pageType)
    scrollToBottom()
  }
}

// 自动滚动监听
watch(() => store.aiMessages.length, () => {
  scrollToBottom()
})

// 监听 hasResult：如果从 true 变为 false (说明用户重新开始起卦/求签/洗牌)
watch(() => props.hasResult, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    // 再次占卜时，自动收起 AI 对话框
    showChat.value = false
    sessionInterpreted.value = false
  }
})

onMounted(() => {
  showChat.value = false
  scrollToBottom()
})
</script>

<style scoped>
.ai-wrapper {
  margin-top: 16px;
  width: 100%;
}

/* 触发按钮面板 */
.ai-trigger-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.ai-prominent-row {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 4px 4px 0 4px;
}

.ai-subtle-row {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-bottom: 8px;
}

.ai-action-btn {
  flex: 1;
  max-width: 240px;
  height: 44px;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.btn-icon {
  font-size: 16px;
}

.btn-interpret {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  border: none;
}

.btn-interpret:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--primary-shadow);
  filter: brightness(1.05);
}

/* 低调风格的“展开 AI 对话”按钮，样式对应收起按钮 */
.ai-subtle-expand-btn {
  background: transparent;
  border: none;
  color: #999999;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 15px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.ai-subtle-expand-btn:hover {
  color: var(--primary);
  background: var(--primary-light);
}

/* 核心 AI 对话卡片面板 */
.ai-chat-panel {
  background: #ffffff;
  border: 1px solid #ebebeb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-top: 8px;
  margin-bottom: 8px;
}

/* 头部 */
.ai-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--primary-light);
  border-bottom: 1px solid #f0f0f0;
}

.ai-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-avatar-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.animate-spin-slow {
  animation: spin 12s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ai-header-name {
  font-size: 14px;
  font-weight: bold;
  color: var(--primary-dark);
}

.ai-clear-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.ai-clear-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

/* 对话流区域 */
.ai-message-list {
  height: 280px;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fafafc;
  scroll-behavior: smooth;
}

.message-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 90%;
}

.message-row.ai {
  align-self: flex-start;
}

.message-row.user {
  align-self: flex-end;
  flex-direction: row-reverse;
  max-width: 85%;
}

.avatar-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #ebebeb;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar {
  background: var(--primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  border: none;
  box-shadow: 0 2px 6px var(--primary-shadow);
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  position: relative;
  word-break: break-all;
}

.ai-bubble {
  background: #ffffff;
  color: #333333;
  border: 1px solid #ebebeb;
  border-top-left-radius: 2px;
}

.user-bubble {
  background: var(--primary);
  color: #ffffff;
  border-top-right-radius: 2px;
  box-shadow: 0 3px 8px var(--primary-shadow);
}

.msg-content {
  white-space: pre-wrap;
}

.msg-content :deep(strong) {
  color: var(--primary-dark);
  font-weight: bold;
}

.user-bubble .msg-content :deep(strong) {
  color: #fff;
  text-decoration: underline;
}

.msg-time {
  font-size: 9px;
  color: #bbbbbb;
  margin-top: 4px;
  text-align: right;
}

.user-bubble .msg-time {
  color: rgba(255, 255, 255, 0.7);
}

/* 展开状态下，有结果但还未解读时的内置解读横幅样式 */
.ai-inline-interpret-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--primary-light);
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.ai-banner-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--primary-dark);
}

.mini-interpret-btn {
  height: 28px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  border: none;
  padding: 0 14px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 6px var(--primary-shadow);
  transition: all 0.2s;
  flex-shrink: 0;
}

.mini-interpret-btn:hover {
  transform: scale(1.03);
  filter: brightness(1.05);
}

.mini-interpret-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 输入框区域 */
.ai-input-bar {
  display: flex;
  padding: 10px 12px;
  background: #ffffff;
  border-top: 1px solid #ebebeb;
  gap: 8px;
}

.ai-input {
  flex: 1;
  height: 36px;
  border-radius: 18px;
  border: 1px solid #dddddd;
  padding: 0 16px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.ai-input:focus {
  border-color: var(--primary);
}

.ai-send-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 18px;
  background: var(--primary);
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.ai-send-btn:hover {
  filter: brightness(1.05);
}

.ai-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 收起按钮行 */
.ai-collapse-row {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 0 16px 0;
}

.ai-collapse-btn {
  background: transparent;
  border: none;
  color: #999999;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 15px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.ai-collapse-btn:hover {
  color: var(--primary);
  background: var(--primary-light);
}

/* 闪烁光标效果 */
.cursor-blink {
  font-weight: bold;
  color: var(--primary);
  animation: blink 0.8s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

/* 动画特效 */
.fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Loading 动画 */
.loading-bubble {
  padding: 14px 20px;
}

.dot-flashing {
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 5px;
  background-color: var(--primary);
  color: var(--primary);
  animation: dot-flashing 1s infinite linear;
  animation-delay: 0.2s;
}
.dot-flashing::before, .dot-flashing::after {
  content: "";
  display: inline-block;
  position: absolute;
  top: 0;
}
.dot-flashing::before {
  left: -12px;
  width: 6px;
  height: 6px;
  border-radius: 5px;
  background-color: var(--primary);
  color: var(--primary);
  animation: dot-flashing 1s infinite linear;
  animation-delay: 0s;
}
.dot-flashing::after {
  left: 12px;
  width: 6px;
  height: 6px;
  border-radius: 5px;
  background-color: var(--primary);
  color: var(--primary);
  animation: dot-flashing 1s infinite linear;
  animation-delay: 0.4s;
}

@keyframes dot-flashing {
  0% { background-color: var(--primary); }
  50%, 100% { background-color: var(--primary-light); }
}
</style>
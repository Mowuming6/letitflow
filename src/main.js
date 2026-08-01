import { createApp, watch } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { store } from './store.js'
import { buildThemeVars } from './theme.js'
import './styles/global.css'

// 主题变量需对全站可用（含 teleport 到 body 的手势/说明弹窗，这类元素脱离了
// .app-shell 无法继承其上的 --primary），故在此统一同步到 :root。
function syncThemeVarsToRoot() {
  const vars = buildThemeVars(store.themeKey)
  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v)
  }
}
syncThemeVarsToRoot()
watch(() => store.themeKey, syncThemeVarsToRoot)

// 昼夜状态也需对全站可用：teleport 到 body 的弹窗脱离了 .app-shell，
// 其上的 .app-shell.dark 选择器无法命中。故把 dark 类同步到 <html>(:root)，
// 让 teleport 弹窗的黑夜样式可用 :root.dark 命中。
function syncDarkClassToRoot() {
  document.documentElement.classList.toggle('dark', !store.isDay)
}
syncDarkClassToRoot()
watch(() => store.isDay, syncDarkClassToRoot)

function setDialogOriginFromElement(el) {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const dx = x - window.innerWidth / 2
  const dy = y - window.innerHeight / 2

  const root = document.documentElement
  root.style.setProperty('--dialog-origin-x', `${x}px`)
  root.style.setProperty('--dialog-origin-y', `${y}px`)
  root.style.setProperty('--dialog-origin-dx', `${dx}px`)
  root.style.setProperty('--dialog-origin-dy', `${dy}px`)
  root.style.setProperty('--dialog-origin-w', `${rect.width}px`)
  root.style.setProperty('--dialog-origin-h', `${rect.height}px`)
}

window.addEventListener('pointerdown', (e) => {
  const trigger = e.target?.closest?.('.help-btn, .theme-btn, .gesture-theme-btn, .ds-theme-btn, .ds-gesture-btn')
  if (!trigger) return
  setDialogOriginFromElement(trigger)
}, true)

// 全局小白防护：禁止右键保存图片、禁止拖拽图片
document.addEventListener('contextmenu', (e) => {
  if (e.target?.tagName === 'IMG') {
    e.preventDefault()
  }
})
document.addEventListener('dragstart', (e) => {
  if (e.target?.tagName === 'IMG') {
    e.preventDefault()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')

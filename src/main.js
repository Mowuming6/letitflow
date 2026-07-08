import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import './styles/global.css'

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
  const trigger = e.target?.closest?.('.help-btn, .theme-btn, .gesture-theme-btn')
  if (trigger) setDialogOriginFromElement(trigger)
}, true)

const app = createApp(App)
app.use(router)
app.mount('#app')

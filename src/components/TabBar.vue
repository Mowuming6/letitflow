<template>
  <div class="tab-bar" :style="themeStyle">
    <div class="tab-scroll" ref="scrollRef"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div class="tab-list">
        <div
          v-for="(item, index) in list"
          :key="item.path"
          class="tab-item"
          :class="{ 'tab-item--active': selected === index }"
          :style="selected === index ? `background:${activeItemBg}` : ''"
          @click="onTabClick(index)"
        >
          <img class="tab-icon" :src="selected === index ? item.activeIcon : item.icon" />
          <span class="tab-text"
            :class="{ 'tab-text--active': selected === index }"
            :style="selected === index ? `color:${activeTextColor}` : ''"
          >{{ item.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { store } from '../store.js'
import { THEMES } from '../theme.js'
import { NAV_LIST } from '../navList.js'

const router = useRouter()
const route = useRoute()
const scrollRef = ref(null)

const list = computed(() => {
  const iconDir = store.getThemeIconDir()
  return NAV_LIST.map(item => ({
    ...item,
    activeIcon: iconDir + item.activeIconFile,
  }))
})

const t = computed(() => THEMES[store.themeKey] || THEMES.jin)
const activeItemBg = computed(() => t.value.primaryLight)
const activeTextColor = computed(() => t.value.primary)
const themeStyle = computed(() => store.getThemeStyle())

const selected = computed(() => {
  const idx = NAV_LIST.findIndex(item => item.path === route.path)
  return idx >= 0 ? idx : 0
})

watch(selected, idx => scrollToTab(idx))

function switchTab(idx) { router.push(NAV_LIST[idx].path) }

let mouseDown = false, mouseStartX = 0, mouseScrollLeft = 0, mouseDragged = false

function onMouseDown(e) {
  const el = scrollRef.value
  if (!el) return
  mouseDown = true
  mouseDragged = false
  mouseStartX = e.pageX - el.offsetLeft
  mouseScrollLeft = el.scrollLeft
  el.style.cursor = 'grabbing'
}

function onMouseMove(e) {
  if (!mouseDown) return
  const el = scrollRef.value
  if (!el) return
  const x = e.pageX - el.offsetLeft
  const delta = x - mouseStartX
  if (Math.abs(delta) > 3) mouseDragged = true
  el.scrollLeft = mouseScrollLeft - delta
}

function onMouseUp() {
  mouseDown = false
  const el = scrollRef.value
  if (el) el.style.cursor = ''
}

function onTabClick(idx) {
  if (mouseDragged) { mouseDragged = false; return }
  switchTab(idx)
}

function scrollToTab(idx) {
  const el = scrollRef.value
  if (!el) return
  const tabW = 56
  const tabLeft = 2 + idx * tabW
  const tabRight = tabLeft + tabW
  const viewW = el.clientWidth
  const cur = el.scrollLeft
  if (!(tabLeft >= cur && tabRight <= cur + viewW)) {
    el.scrollTo({ left: Math.max(0, tabLeft + tabW / 2 - viewW / 2), behavior: 'smooth' })
  }
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 56px;
  background: #FFFFFF;
  border-top: 1px solid #EBEBEB;
  z-index: 200;
}
.tab-scroll {
  width: 100%; height: 100%;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: none; -ms-overflow-style: none;
  cursor: grab;
  user-select: none;
}
.tab-scroll::-webkit-scrollbar { display: none; }
.tab-list {
  display: flex; height: 100%;
  width: max-content; padding: 0 2px;
}
.tab-item {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-width: 56px; height: 100%;
  padding: 0 6px; border-radius: 8px;
  cursor: pointer; transition: background 0.15s; gap: 2px;
}
.tab-icon { width: 22px; height: 22px; object-fit: contain; }
.tab-text { font-size: 10px; color: #999; white-space: nowrap; }
.tab-text--active { color: var(--primary); font-weight: bold; }

/* Hidden on desktop — sidebar handles navigation */
@media (min-width: 768px) {
  .tab-bar { display: none !important; }
}
</style>

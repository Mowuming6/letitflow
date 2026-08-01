<template>
  <div class="tab-bar" :class="{ dark: !store.isDay }" :style="themeStyle">
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
          <img v-if="item.activeIconFile" class="tab-icon" :src="item.activeIcon" />
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
const activeItemBg = computed(() => store.isDay ? t.value.primaryLight : t.value.primaryDark)
const activeTextColor = computed(() => store.isDay ? t.value.primary : t.value.primaryLight)
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
  left: 0;
  width: 100%;
  height: 56px;
  background: rgba(255, 255, 255, 0.7);
  border-top: 1px solid #EBEBEB;
  z-index: 200;
}
.tab-bar.dark {
  background: rgba(0, 0, 0, 0.7);
  border-top-color: rgba(255, 255, 255, 0.08);
}
/* 黑夜模式：选中态图标转亮（≈primaryLight） */
.tab-bar.dark .tab-item--active .tab-icon {
  filter: brightness(0) invert(1);
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
  cursor: pointer; transition: background 0.15s, transform 0.2s ease;
  gap: 2px;
}
.tab-item:hover { transform: translateY(-3px); background: var(--primary-light, #FFF8EC); }
.tab-item:active { transform: translateY(-1px); }
/* 悬停态与选中态完全一致：黑夜 bg=primaryDark、icon/文字=primaryLight；白昼文字=primary */
.tab-item:hover .tab-text { color: var(--primary); }
.tab-bar.dark .tab-item:hover { background: var(--primary-dark); }
.tab-bar.dark .tab-item:hover .tab-icon { filter: brightness(0) invert(1); }
.tab-bar.dark .tab-item:hover .tab-text { color: var(--primary-light); }
.tab-icon { width: 22px; height: 22px; object-fit: contain; }
.tab-text { font-size: 10px; color: #999; white-space: nowrap; }
.tab-text--active { color: var(--primary); font-weight: bold; }

/* Hidden on desktop — sidebar handles navigation */
@media (min-width: 768px) {
  .tab-bar { display: none !important; }
}
</style>

<style>
/* 手势悬停高亮（非 scoped） */
.tab-bar .tab-item.gesture-hovered {
  transform: translateY(-3px) !important;
  background: var(--primary-light, #FFF8EC) !important;
}
.tab-bar .tab-item.gesture-hovered .tab-text {
  color: var(--primary) !important;
  font-weight: bold !important;
}
.tab-bar.dark .tab-item.gesture-hovered {
  background: var(--primary-dark) !important;
}
.tab-bar.dark .tab-item.gesture-hovered .tab-icon {
  filter: brightness(0) invert(1) !important;
}
.tab-bar.dark .tab-item.gesture-hovered .tab-text {
  color: var(--primary-light) !important;
}
</style>

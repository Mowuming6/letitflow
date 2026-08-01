<template>
  <div class="app-shell" :class="[`theme-${store.themeKey}`, !store.isDay ? 'dark' : '', store.topBarVisible ? 'topbar-visible' : '', hasPageBg ? (store.isDay ? 'box-bg' : 'box-bg night-bg') : '']" :style="themeStyle">
    <!-- 非首页界面的统一铺底背景：白昼用白.png，黑夜用夜.png -->
    <div class="global-page-bg" v-if="hasPageBg" aria-hidden="true">
      <div class="gpb-img" :style="{ backgroundImage: `url('${pageBgImage}')` }"></div>
      <div class="gpb-tint"></div>
    </div>
    <!-- Desktop sidebar (hidden on mobile via CSS) -->
    <aside class="sidebar" :style="themeStyle">
      <div class="sidebar-brand">
        <div class="sidebar-brand-top">
          <img class="sidebar-logo" :src="`/images/themes/${store.themeKey}/LOGO.png`" alt="logo" />
          <span class="sidebar-title">不必纠结 随天意</span>
        </div>
        <span class="sidebar-sub">把纠结交给随机<br>把勇气留给自己</span>
      </div>
      <nav class="sidebar-nav">
        <div
          v-for="item in mainNavItems"
          :key="item.path"
          class="sidebar-item"
          :class="{ 'sidebar-item--active': route.path === item.path }"
          :title="item.text"
          @click="router.push(item.path)"
        >
          <img v-if="item.activeIconFile" class="sidebar-icon" :src="item.activeIcon" />
          <span v-else class="sidebar-label sidebar-label--textonly">{{ item.text }}</span>
        </div>
      </nav>
      <!-- 关于网站：固定在顶栏最右侧 -->
      <div
        v-if="aboutItem"
        class="sidebar-item sidebar-about"
        :class="{ 'sidebar-item--active': route.path === aboutItem.path }"
        :title="aboutItem.text"
        @click="router.push(aboutItem.path)"
      >
        <span class="sidebar-label sidebar-label--textonly">{{ aboutItem.text }}</span>
      </div>
    </aside>

    <!-- Page content -->
    <div class="page-wrap">
      <router-view />
    </div>

    <!-- 非首页：左上角返回按钮（样式与首页手势按钮一致） -->
    <PageBackButton />

    <!-- Mobile bottom nav -->
    <TabBar />

    <GlobalOverlays />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import GlobalOverlays from './components/GlobalOverlays.vue'
import PageBackButton from './components/PageBackButton.vue'
import { store } from './store.js'
import { NAV_LIST } from './navList.js'
import { initCounters } from './composables/useCounters.js'
import whiteBg from '../public/images/background/白.png'
import darkBg from '../public/images/background/夜.png'

const router = useRouter()
const route = useRoute()

const themeStyle = computed(() => store.getThemeStyle())

// 统一背景：非首页界面的铺底背景图
// 白昼模式：除 首页(/index)、骰子展示页(/diceshowcase,/flow) 外，
//          使用白.png（含今日运势/box，统一由全局背景处理）
// 黑夜模式：除 首页(/index) 外，所有其它界面（含今日运势/box）统一使用 夜.png
const DAY_EXCLUDE = ['/index', '/diceshowcase', '/flow']
const NIGHT_EXCLUDE = ['/index']
const pageBgImage = computed(() => {
  if (store.isDay) {
    return DAY_EXCLUDE.includes(route.path) ? '' : whiteBg
  }
  return NIGHT_EXCLUDE.includes(route.path) ? '' : darkBg
})
const hasPageBg = computed(() => !!pageBgImage.value)

// 桌面端：鼠标悬停在页面顶部区域或手势光标移到上方时，显示上方栏
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches
function handlePointerMove(e) {
  // 真实鼠标移入顶部 20px 触发；手势光标由 GlobalOverlays 每帧同步 store.topBarVisible
  if (isDesktop()) store.topBarVisible = e.clientY < 20
}
function hideTopBar() { store.topBarVisible = false }

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.addEventListener('mouseleave', hideTopBar)
  initCounters()   // 打开网页即累加「帮助人数」计数
})
onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('mouseleave', hideTopBar)
})
const navItems = computed(() => {
  const iconDir = store.getThemeIconDir()
  return NAV_LIST.map(item => ({ ...item, activeIcon: iconDir + item.activeIconFile }))
})
// 顶栏布局：除「关于网站」外的导航图标，关于网站单独固定在右侧
const aboutItem = computed(() => NAV_LIST.find(i => i.path === '/about'))
const mainNavItems = computed(() => {
  const iconDir = store.getThemeIconDir()
  return NAV_LIST.filter(i => i.path !== '/about').map(item => ({ ...item, activeIcon: iconDir + item.activeIconFile }))
})
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}
html {
  margin: 0; padding: 0;
  height: 100%;
}
body {
  margin: 0; padding: 0;
  min-height: 100%;
  color: #333333;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #E8E8E8;
  overflow-x: hidden;
}

/* ─ App shell ── */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Mobile: centered narrow shell ── */
.sidebar { display: none; }
.page-wrap {
  flex: 1;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  align-self: center;
  background: #F8F8FA;
  /* Use modern viewport units to avoid mobile browser chrome causing extra scroll */
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  position: relative;
  padding-bottom: 56px; /* reserve space for fixed TabBar */
  display: flex;
  flex-direction: column;
}

/*
  Prevent "scrollable blank space" on mobile:
  Many pages declare `.container { min-height: 100vh; }` in scoped styles.
  Inside `.page-wrap` (which already accounts for the fixed TabBar), that forces
  the page to exceed the visible area. We let the router-view content flex-fill.
*/
.page-wrap > .container {
  flex: 1;
  min-height: 0 !important;
}

/* ── Desktop (≥768px): sidebar + content ── */

.sidebar-brand {
  padding: 16px 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  flex-shrink: 0;
}
.sidebar-brand-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}
.sidebar-title {
  font-size: 15px;
  font-weight: bold;
  color: var(--primary, #DAAB5A);
  letter-spacing: 1px;
  line-height: 1.3;
}
.sidebar-sub {
  font-size: 11px;
  color: #BBBBBB;
  line-height: 1.7;
  letter-spacing: 0.5px;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 6px;
  flex: 1;
  overflow-y: auto;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  user-select: none;
}
.sidebar-item:hover {
  background: var(--primary-light, #FFF8EC);
  transform: translateX(6px);
}
.sidebar-item:active {
  transform: translateX(4px);
}
.sidebar-item--active { background: var(--primary-light, #FFF8EC); }
.sidebar-icon { width: 20px; height: 20px; object-fit: contain; flex-shrink: 0; }
.sidebar-label {
  font-size: 13px;
  color: #555;
  white-space: nowrap;
}
.sidebar-item--active .sidebar-label {
  color: var(--primary, #DAAB5A);
  font-weight: 600;
}
/* 白昼：悬停态文字也变为 primary（与选中态一致） */
.sidebar-item:hover .sidebar-label {
  color: var(--primary, #DAAB5A);
  font-weight: 600;
}

/* ── Desktop (≥768px): top navigation bar (always visible, never hidden) ── */
@media (min-width: 768px) {
  body { background: #EFEFEF; }
  .app-shell { flex-direction: column; align-items: stretch; }

  .sidebar {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 30px;
    position: fixed;
    top: 0; left: 0; right: 0;
    background: rgba(255, 255, 255, 0.7);
    border-right: none;
    border-bottom: 1px solid #EBEBEB;
    z-index: 200;
    transform: translateY(-100%);
    transition: transform 0.25s ease;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
    padding: 0 16px;
    gap: 18px;
    overflow: visible;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  /* 仅当鼠标悬停在页面顶部区域时，上方栏才滑入显示 */
  .app-shell.topbar-visible .sidebar { transform: translateY(0); }

  .sidebar-brand {
    flex-direction: row;
    align-items: center;
    border-bottom: none;
    border-right: 1px solid rgba(255, 255, 255, 0.5);
    padding: 0 18px 0 4px;
    gap: 10px;
    flex-shrink: 0;
  }
  .sidebar-sub { display: none; }
  .sidebar-logo { width: 24px; height: 24px; }
  .sidebar-title { font-size: 13px; }
  .sidebar-nav {
    flex-direction: row;
    flex: 1;
    padding: 0;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    align-items: center;
    justify-content: center;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .sidebar-nav::-webkit-scrollbar { display: none; }
  /* 顶栏只显示图标，无常驻文字；功能名通过鼠标悬停 (title) 显示 */
  .sidebar-label { display: none; }
  .sidebar-label--textonly { display: inline !important; font-size: 11px; }
  /* 关于网站：固定在顶栏最右侧（无边框） */
  .sidebar-about {
    margin-left: auto;
    padding-left: 12px;
  }
  .sidebar-item {
    justify-content: center;
    height: 26px;
    padding: 0 10px;
    border-radius: 8px;
  }
  .sidebar-icon { width: 20px; height: 20px; }
  .sidebar-item--active { background: var(--primary-light, #FFF8EC); }
  .sidebar-item:hover { transform: translateY(-2px); background: var(--primary-light, #FFF8EC); }
  .sidebar-item:active { transform: translateY(-1px); }

  .page-wrap {
    margin-left: 0;
    margin-top: 0;
    max-width: none;
    flex: 1;
    background: #EFEFEF;
    min-height: calc(100vh - 30px);
    min-height: calc(100svh - 30px);
    min-height: calc(100dvh - 30px);
    align-self: stretch;
    padding-bottom: 0;
    transition: margin-top 0.25s ease;
  }
  /* 顶栏出现时，页面内容下移到顶栏之下 */
  .app-shell.topbar-visible .page-wrap { margin-top: 30px; }

  /* 顶栏出现时，骰子页的 手势/昼夜/主题 悬浮按钮整体下移，避开顶栏 */
  .app-shell.topbar-visible .ds-gesture-btn,
  .app-shell.topbar-visible .ds-daynight-btn,
  .app-shell.topbar-visible .ds-back-page2 { top: 40px; }
  .app-shell.topbar-visible .ds-theme-btn { top: 76px; }
}

/* 黑夜模式：顶栏改为黑色半透明 */
.app-shell.dark .sidebar {
  background: rgba(0, 0, 0, 0.7);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
.app-shell.dark .sidebar-brand {
  border-right-color: rgba(255, 255, 255, 0.08);
}
/* 黑夜模式：选中/悬停态底色 primaryDark，图标与文字均为 primaryLight（两者效果完全一致） */
.app-shell.dark .sidebar-item--active,
.app-shell.dark .sidebar-item:hover {
  background: var(--primary-dark);
}
  .app-shell.dark .sidebar-item--active .sidebar-icon,
  .app-shell.dark .sidebar-item:hover .sidebar-icon {
    filter: brightness(0) invert(1);
  }
  .app-shell.dark .sidebar-item--active .sidebar-label,
  .app-shell.dark .sidebar-item:hover .sidebar-label {
    color: var(--primary-light) !important;
    font-weight: 600;
  }

  /* ── 统一背景（白昼：白.png + 主题色叠加；黑夜：夜.png + 暗色叠加）── */
  .global-page-bg {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }
  .global-page-bg .gpb-img {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: var(--page-bg);
    filter: brightness(1);
  }
  .global-page-bg .gpb-tint {
    position: absolute;
    inset: 0;
    background: var(--page-bg);
    opacity: 0.55;
  }
  /* 白昼模式：原图轻微提亮，减少背景视觉强度 */
  .app-shell.box-bg:not(.night-bg) .global-page-bg .gpb-img {
    filter: brightness(1);
  }
  /* 黑夜模式：夜.png 原图直出（亮度 0.85，仅极轻微压暗以便看清夜景），渐变由 .gpb-tint 提供 */
  .app-shell.night-bg .global-page-bg .gpb-img {
    filter: brightness(0.85);
  }
  /* 黑夜模式：夜.png 之上叠加主题色纯色半透明层（无渐变） */
  .app-shell.night-bg .global-page-bg .gpb-tint {
    display: block;
    opacity: 1;
    background: rgba(var(--primary-dark-rgb), 0.10);
  }
  /* 启用统一背景时，让 page-wrap 与各页 .container 透出背后的图层 */
  .app-shell.box-bg .page-wrap { background: transparent; }
  .app-shell.box-bg .container { background: transparent !important; }
</style>

<style>
/* 手势悬停高亮（非 scoped）—— 侧边栏（上方栏）*/
.sidebar-item.gesture-hovered {
  background: var(--primary-light, #FFF8EC) !important;
  transform: translateY(-2px) !important;
}
.sidebar-item.gesture-hovered .sidebar-label {
  color: var(--primary, #DAAB5A) !important;
  font-weight: 600 !important;
}
.app-shell.dark .sidebar-item.gesture-hovered {
  background: var(--primary-dark) !important;
}
.app-shell.dark .sidebar-item.gesture-hovered .sidebar-icon {
  filter: brightness(0) invert(1) !important;
}
.app-shell.dark .sidebar-item.gesture-hovered .sidebar-label {
  color: var(--primary-light) !important;
  font-weight: 600 !important;
}

/* 返回按钮 */
.page-back-btn.gesture-hovered {
  background: rgba(20,20,30,0.45) !important;
}
.page-back-btn.dn-mode-day.gesture-hovered {
  background: rgba(255,255,255,0.95) !important;
}
</style>

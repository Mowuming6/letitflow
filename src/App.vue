<template>
  <div class="app-shell" :class="[`theme-${store.themeKey}`, store.isDark ? 'dark' : '']">
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
          v-for="item in navItems"
          :key="item.path"
          class="sidebar-item"
          :class="{ 'sidebar-item--active': route.path === item.path }"
          @click="router.push(item.path)"
        >
          <img class="sidebar-icon" :src="route.path === item.path ? item.activeIcon : item.icon" />
          <span class="sidebar-label">{{ item.text }}</span>
        </div>
      </nav>
    </aside>

    <!-- Page content -->
    <div class="page-wrap">
      <router-view />
    </div>

    <!-- Mobile bottom nav -->
    <TabBar />

    <GlobalOverlays />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import GlobalOverlays from './components/GlobalOverlays.vue'
import { store } from './store.js'
import { NAV_LIST } from './navList.js'

const router = useRouter()
const route = useRoute()

const themeStyle = computed(() => store.getThemeStyle())
const navItems = computed(() => {
  const iconDir = store.getThemeIconDir()
  return NAV_LIST.map(item => ({ ...item, activeIcon: iconDir + item.activeIconFile }))
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
  min-height: 100vh;
  position: relative;
  padding-bottom: 56px; /* reserve space for fixed TabBar */
}

/* ── Desktop (≥768px): sidebar + content ── */
@media (min-width: 768px) {
  body { background: #EFEFEF; }
  .app-shell { flex-direction: row; align-items: flex-start; }

  .sidebar {
    display: flex;
    flex-direction: column;
    width: 200px;
    min-height: 100vh;
    height: 100vh;
    position: fixed;
    left: 0; top: 0; bottom: 0;
    background: #FFFFFF;
    border-right: 1px solid #EBEBEB;
    z-index: 200;
    overflow-y: auto;
  }

  .page-wrap {
    margin-left: 200px;
    max-width: none;
    flex: 1;
    background: #EFEFEF;
    min-height: 100vh;
    align-self: stretch; /* 👈 重置为高度拉伸，彻底干掉因垂直居中产生的大片下方空白 */
    padding-bottom: 0;
  }
}

/* ── Sidebar internals ── */
.sidebar-brand {
  padding: 16px 16px 14px;
  border-bottom: 1px solid #F0F0F0;
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
</style>

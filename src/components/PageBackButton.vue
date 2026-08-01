<template>
  <button
    v-if="showBack"
    class="page-back-btn"
    type="button"
    :class="{ 'dn-mode-day': isDay }"
    @click.stop="goBack"
    aria-label="返回首页"
  ><span class="page-back-text">返回</span></button>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../store'

const route = useRoute()
const router = useRouter()

const isDay = computed(() => store.isDay)

// 首页（'/'、'/index'）不显示返回按钮，其它页面都显示
const showBack = computed(() => {
  const p = route.path
  return p !== '/' && p !== '/index'
})

function goBack() {
  // 从首页第二页（带 page=2）进入的占卜页，点返回回到首页第二页；
  // 其它情况直接回到首页第一页。
  if (route.query.page === '2') {
    router.push({ path: '/index', query: { from: 'index', page: '2' } })
  } else {
    router.push('/index')
  }
}
</script>

<style scoped>
/* 与首页手势按钮（.ds-gesture-btn）完全一致的玻璃拟态样式 */
.page-back-btn {
  position: fixed;
  z-index: 210;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 25px;
  width: 51px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 999px;
  background: rgba(20,20,30,0.30);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: background .2s, transform .1s, top .25s ease;
}
.page-back-btn:active { transform: scale(0.96); }
/* 昼间：白底、黑字、深色边框 */
.page-back-btn.dn-mode-day {
  color: #1a1a1a;
  background: rgba(255,255,255,0.30);
  border-color: rgba(0,0,0,0.25);
}
.page-back-btn.dn-mode-day:hover { background: rgba(255,255,255,0.5); }
/* 文字透明度与首页手势按钮一致（.ds-gesture-text { opacity: 0.5 }） */
.page-back-text { opacity: 0.5; }

@media (max-width: 480px) {
  .page-back-btn { height: 26px; width: 45px; padding: 0 10px; font-size: 11px; }
}
@media (min-width: 1024px) {
  .page-back-btn { height: 27px; width: 58px; padding: 0 14px; font-size: 13px; }
}
</style>

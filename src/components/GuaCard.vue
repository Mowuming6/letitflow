<template>
  <div class="gua-result-card">
    <slot name="header" />
    <div class="gua-display-title">{{ title }}</div>
    <div class="gua-poem">{{ poem }}</div>
    <div class="gua-divider"></div>
    <div class="gua-meta gua-meta-last">卦释义：{{ jiyi }}</div>
    <div class="q-tabs">
      <div v-for="(label, i) in TAB_LABELS" :key="i"
        class="q-tab" :class="{ 'q-tab-on': activeTab === i }"
        @click="$emit('tabChange', i)">{{ label }}</div>
    </div>
    <div class="q-tab-content">
      <span class="q-content-text">{{ tabs[activeTab] }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  poem: String,
  jiyi: String,
  tabs: Array,
  activeTab: { type: Number, default: 0 },
})
defineEmits(['tabChange'])
const TAB_LABELS = ['事业', '经商', '求名', '外出', '婚恋', '决策']
</script>

<style scoped>
.gua-result-card {
  background: var(--bg-color-2, #FCFCF9); /* 使用主题对应的 bgColor2 颜色 */
  background-image: radial-gradient(rgba(var(--primary-rgb), 0.02) 1px, transparent 0); /* 极淡的底纹 */
  background-size: 8px 8px;
  border: 1px dashed var(--primary); /* 内圈虚线 */
  outline: 4px solid rgba(var(--primary-rgb), 0.05); /* 外圈微衬 */
  border-radius: 8px;
  padding: 16px 14px 0;
  margin-top: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(var(--primary-rgb), 0.04);
  position: relative;
  overflow: hidden;
}

/* 古风结果角饰 */
.gua-result-card::before, .gua-result-card::after {
  content: "";
  position: absolute;
  width: 6px;
  height: 6px;
  border: 1px solid var(--primary);
}
.gua-result-card::before { top: 4px; left: 4px; border-right: none; border-bottom: none; }
.gua-result-card::after { bottom: 4px; right: 4px; border-left: none; border-top: none; }

.gua-display-title {
  text-align: center;
  font-size: 17px;
  font-weight: bold;
  color: #1A1A2E;
  margin-bottom: 10px;
}
.gua-poem {
  font-size: 14px;
  color: #333;
  line-height: 2;
  text-align: center;
  white-space: pre-wrap;
}
.gua-divider { height: 1px; background: #EBEBEB; margin: 10px 0; }
.gua-meta { font-size: 12px; color: #666; line-height: 1.7; }
.gua-meta-last { margin-bottom: 0; }
.q-tabs { display: flex; border-top: 1px solid #EBEBEB; margin-top: 10px; }
.q-tab {
  flex: 1; text-align: center; font-size: 12px;
  padding: 10px 0; color: #999; cursor: pointer;
}
.q-tab-on {
  color: var(--primary); font-weight: bold;
  border-bottom: 2px solid var(--primary);
}
.q-tab-content { padding: 12px 0 14px; min-height: 80px; }
.q-content-text { font-size: 13px; color: #555; line-height: 1.9; white-space: pre-wrap; }
</style>

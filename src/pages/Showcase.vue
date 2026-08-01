<template>
  <div class="showcase-page">
    <div class="showcase-content">
      <DiceShowcase />
    </div>
  </div>
</template>

<script setup>
import DiceShowcase from './DiceShowcase.vue'
</script>

<style scoped>
.showcase-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex; flex-direction: column; overflow: hidden;
}
.showcase-content {
  flex: 1; position: relative; overflow: hidden; min-height: 0;
}
.showcase-content :deep(.back-btn) { display: none; }
</style>

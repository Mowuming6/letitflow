<template>
  <div class="container" :style="themeStyle">
    <div class="page-title">📋 占卜历史</div>
    <div class="page-subtitle">你的每一次问卜，都留下了印记</div>

    <!-- 筛选栏 -->
    <div v-if="totalCount > 0" class="filter-bar">
      <div class="filter-inner">
        <div v-for="tab in filterTabs" :key="tab.key"
          class="filter-tab" :class="{ active: activeFilter === tab.key }"
          @click="onFilterTap(tab.key)">
          {{ tab.label }}
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div v-if="totalCount > 0" class="toolbar">
      <span class="toolbar-count">共 {{ filteredList.length }} 条记录</span>
      <span class="toolbar-btn" @click="toggleEditMode">{{ editMode ? '取消' : '管理' }}</span>
    </div>

    <!-- 编辑模式操作栏 -->
    <div v-if="editMode" class="edit-bar">
      <span class="edit-btn" @click="selectAll">全选</span>
      <span class="edit-btn" @click="deselectAll">取消全选</span>
      <span class="edit-btn danger" @click="deleteSelected">删除 ({{ selectedCount }})</span>
    </div>

    <!-- 空状态 -->
    <div v-if="totalCount === 0" class="empty-wrap">
      <span class="empty-emoji">🔮</span>
      <span class="empty-text">还没有占卜记录</span>
      <span class="empty-sub">去试试各种占卜功能吧</span>
    </div>

    <!-- 历史列表 -->
    <div v-if="totalCount > 0" class="history-list">
      <div v-for="item in pagedList" :key="item.id"
        class="history-item" :class="{ selected: item.selected }"
        @click="onItemTap(item.id)">
        <div v-if="editMode" class="item-check">
          <div class="checkbox" :class="{ checked: item.selected }">
            <span v-if="item.selected">✓</span>
          </div>
        </div>
        <div class="item-content">
          <div class="item-type">
            <img v-if="item.icon" class="item-type-icon" :src="item.icon" />
            <span>{{ item.typeName || item.type }}</span>
          </div>
          <div class="item-result">{{ item.result }}</div>
          <div v-if="item.desc" class="item-desc">{{ item.desc }}</div>
          <div class="item-time">{{ item.timeStr }}</div>
        </div>
      </div>

      <!-- 分页导航 -->
      <div v-if="totalPages > 1" class="pagination-row">
        <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
      </div>

      <div v-if="!editMode" class="clear-row">
        <button class="btn-danger" @click="clearAll">
          🗑️ {{ activeFilter === 'all' ? '清空全部记录' : '清空' + activeFilterLabel + '记录' }}
        </button>
      </div>
    </div>
    <div style="height:0px"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { store } from '../store.js'
import { showToast, showModal } from '../composables/useModal.js'

const themeStyle = computed(() => store.getThemeStyle())

const FILTER_TABS = [
  { key: 'all',     label: '全部' },
  { key: '运势',    label: '运势' },
  { key: '骰子',    label: '骰子' },
  { key: '硬币',    label: '硬币' },
  { key: '转盘',    label: '转盘' },
  { key: '掷圣杯',  label: '掷圣杯' },
  { key: '观音灵签', label: '观音灵签' },
  { key: '金钱卦',  label: '金钱卦' },
  { key: '梅花易数', label: '梅花易数' },
  { key: '塔罗占卜', label: '塔罗占卜' },
  { key: '答案之书', label: '答案之书' },
  { key: '雷诺曼占卜', label: '雷诺曼占卜' },
]

function typeToIcon(type) {
  const iconDir = store.getThemeIconDir()
  if (!type) return ''
  if (type.includes('运势')) return iconDir + 'tab_box_active.png'
  if (type.includes('骰子')) return iconDir + 'tab_dice_active.png'
  if (type.includes('硬币')) return iconDir + 'tab_coin_active.png'
  if (type.includes('转盘')) return iconDir + 'tab_wheel_active.png'
  if (type.includes('掷圣杯')) return iconDir + 'tab_jiao_active.png'
  if (type.includes('观音灵签')) return iconDir + 'tab_qian_active.png'
  if (type.includes('金钱卦')) return iconDir + 'tab_liuyao_active.png'
  if (type.includes('梅花易数')) return iconDir + 'tab_plum_active.png'
  if (type.includes('塔罗占卜')) return iconDir + 'tab_tarot_active.png'
  if (type.includes('答案之书')) return iconDir + 'tab_book_active.png'
  if (type.includes('雷诺曼占卜')) return iconDir + 'tab_lenormand_active.png'
  return ''
}

function typeStrip(type) {
  if (!type) return ''
  const idx = type.indexOf(' ')
  return idx >= 0 ? type.slice(idx + 1) : type
}

const filterTabs = FILTER_TABS
const activeFilter = ref('all')
const activeFilterLabel = ref('全部')
const editMode = ref(false)
const selectedCount = ref(0)

const historyList = ref([])
const filteredList = ref([])
const totalCount = ref(0)

const PAGE_SIZE = 20
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / PAGE_SIZE)))
const pagedList = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredList.value.slice(start, start + PAGE_SIZE)
})

function loadHistory() {
  const list = store.getHistory().map(item => ({
    ...item,
    selected: false,
    icon: typeToIcon(item.type),
    typeName: typeStrip(item.type),
  }))
  historyList.value = list
  totalCount.value = list.length
  applyFilter()
}

function applyFilter() {
  const key = activeFilter.value
  filteredList.value = key === 'all'
    ? historyList.value
    : historyList.value.filter(item => item.type && item.type.includes(key))
  currentPage.value = 1
}

function onFilterTap(key) {
  const tab = FILTER_TABS.find(t => t.key === key)
  activeFilter.value = key
  activeFilterLabel.value = tab ? tab.label : key
  applyFilter()
}

function toggleEditMode() {
  if (editMode.value) {
    historyList.value = historyList.value.map(item => ({ ...item, selected: false }))
    editMode.value = false
    selectedCount.value = 0
    applyFilter()
  } else {
    editMode.value = true
  }
}

function onItemTap(id) {
  if (!editMode.value) return
  historyList.value = historyList.value.map(item =>
    item.id === id ? { ...item, selected: !item.selected } : item
  )
  filteredList.value = filteredList.value.map(item =>
    item.id === id ? { ...item, selected: !item.selected } : item
  )
  selectedCount.value = historyList.value.filter(item => item.selected).length
}

function selectAll() {
  const ids = new Set(filteredList.value.map(item => item.id))
  historyList.value = historyList.value.map(item =>
    ids.has(item.id) ? { ...item, selected: true } : item
  )
  filteredList.value = filteredList.value.map(item => ({ ...item, selected: true }))
  selectedCount.value = historyList.value.filter(item => item.selected).length
}

function deselectAll() {
  historyList.value = historyList.value.map(item => ({ ...item, selected: false }))
  filteredList.value = filteredList.value.map(item => ({ ...item, selected: false }))
  selectedCount.value = 0
}

async function deleteSelected() {
  if (selectedCount.value === 0) { showToast('请先选择记录'); return }
  const res = await showModal({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedCount.value} 条记录吗？`,
    confirmColor: '#e05c5c',
  })
  if (!res.confirm) return
  const ids = new Set(historyList.value.filter(item => item.selected).map(item => item.id))
  store.history = store.history.filter(item => !ids.has(item.id))
  localStorage.setItem('divination_history', JSON.stringify(store.history))
  editMode.value = false
  selectedCount.value = 0
  loadHistory()
  showToast('已删除')
}

async function clearAll() {
  const isAll = activeFilter.value === 'all'
  const res = await showModal({
    title: '确认清空',
    content: `确定要清空${isAll ? '全部' : activeFilterLabel.value}占卜记录吗？`,
    confirmColor: '#e05c5c',
  })
  if (!res.confirm) return
  if (isAll) {
    store.clearHistory()
  } else {
    store.history = store.history.filter(item => !item.type || !item.type.includes(activeFilter.value))
    localStorage.setItem('divination_history', JSON.stringify(store.history))
  }
  editMode.value = false
  selectedCount.value = 0
  loadHistory()
  showToast('已清空')
}

onMounted(loadHistory)

// Reload when theme changes (icons update)
watch(() => store.themeKey, loadHistory)
// Reload when history changes from other pages
watch(() => store.history.length, loadHistory)
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: var(--page-bg, #F8F8FA);
  padding: 12px 12px 30px;
}
.page-title { margin-top: 12px; }
.filter-bar {
  margin-top: 6px; margin-bottom: 10px;
  overflow-x: auto; scrollbar-width: none;
}
.filter-bar::-webkit-scrollbar { display: none; }
.filter-inner {
  display: inline-flex; align-items: center;
  padding: 3px 0 5px; gap: 6px; white-space: nowrap;
}
.filter-tab {
  display: flex; align-items: center; flex-shrink: 0;
  padding: 6px 12px; font-size: 12px; color: #888;
  background: #FFFFFF; border-radius: 12px;
  border: 1px solid #EBEBEB; cursor: pointer;
}
.filter-tab.active {
  color: var(--primary); background: var(--primary-light);
  border-color: var(--primary);
}
.toolbar {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 8px; padding: 0 4px;
}
.toolbar-count { font-size: 12px; color: #999; }
.toolbar-btn { font-size: 13px; color: var(--primary); cursor: pointer; padding: 4px 10px; }
.edit-bar {
  display: flex; gap: 10px; margin-bottom: 8px;
  padding: 8px 10px; background: #FFFFFF;
  border-radius: 6px; border: 1px solid #EBEBEB;
}
.edit-btn { font-size: 13px; color: var(--primary); cursor: pointer; padding: 3px 8px; }
.edit-btn.danger { color: #e05c5c; }
.empty-wrap {
  display: flex; flex-direction: column;
  align-items: center; padding: 50px 0; gap: 8px;
}
.empty-emoji { font-size: 40px; }
.empty-text { font-size: 16px; color: #aaa; font-weight: bold; }
.empty-sub { font-size: 13px; color: #666; }
.history-list { width: 100%; }
.history-item {
  display: flex; align-items: flex-start;
  background: #FFFFFF; border: 1px solid #EBEBEB;
  border-radius: 7px; padding: 10px 12px;
  margin-bottom: 8px; transition: background 0.2s;
  cursor: pointer;
}
.history-item.selected {
  background: var(--primary-light); border-color: var(--primary);
}
.item-check { margin-right: 8px; padding-top: 4px; }
.checkbox {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #DDD;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #FFF;
}
.checkbox.checked { background: var(--primary); border-color: var(--primary); }
.item-content { flex: 1; }
.item-type {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--primary); margin-bottom: 3px;
}
.item-type-icon { width: 16px; height: 16px; object-fit: contain; flex-shrink: 0; }
.item-result { font-size: 16px; font-weight: bold; color: #1A1A2E; margin-bottom: 3px; }
.item-desc {
  font-size: 12px; color: #888; line-height: 1.6; margin-bottom: 4px;
  display: -webkit-box; -webkit-line-clamp: 2;line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.item-time { font-size: 11px; color: #BBB; }
.pagination-row {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 12px 0;
}
.page-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid #EBEBEB; background: #FFF;
  font-size: 18px; color: var(--primary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.page-btn:disabled { color: #CCC; border-color: #EEE; cursor: not-allowed; }
.page-info { font-size: 13px; color: #888; }
.clear-row { display: flex; justify-content: center; margin-top: 12px;margin-bottom: 25px;  }
.btn-danger {
  background: rgba(224,92,92,0.15);
  border: 1px solid rgba(224,92,92,0.4);
  color: #e05c5c; border-radius: 6px;
  font-size: 13px; padding: 8px 20px;
  cursor: pointer; -webkit-appearance: none;appearance: none; 
}
</style>

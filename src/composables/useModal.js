import { reactive } from 'vue'

export const toastState = reactive({ show: false, title: '' })
export const modalState = reactive({
  show: false,
  title: '',
  content: '',
  confirmText: '确定',
  cancelText: '取消',
  dangerConfirm: false,
  _resolve: null,
})

let _toastTimer = null

export function showToast(title, duration = 1500) {
  toastState.title = title
  toastState.show = true
  if (_toastTimer) clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { toastState.show = false }, duration)
}

export function showModal({ title = '', content = '', confirmColor = '' } = {}) {
  return new Promise(resolve => {
    modalState.title = title
    modalState.content = content
    modalState.dangerConfirm = confirmColor === '#e05c5c'
    modalState._resolve = resolve
    modalState.show = true
  })
}

export function confirmModal() {
  modalState.show = false
  if (modalState._resolve) { modalState._resolve({ confirm: true }); modalState._resolve = null }
}

export function cancelModal() {
  modalState.show = false
  if (modalState._resolve) { modalState._resolve({ confirm: false }); modalState._resolve = null }
}

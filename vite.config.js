import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { whitespace: 'preserve' } } })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  base: './',
  server: {
    port: 3000,
    host: true,
    open: true
  }
})

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
    open: true,
    // Local dev: proxy /api/* to Cloudflare Pages Functions via wrangler
    // Run in another terminal:
    //   npx wrangler pages dev . --compatibility-date=2024-11-01 --port 8788
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

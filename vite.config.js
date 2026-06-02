import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // ⚠️ 切换到 Vercel 部署，必须把路径改回单斜杠 '/'
})
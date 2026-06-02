import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/1989-record/', // 确保此处的仓库名与你的 GitHub 仓库名称完全一致
})
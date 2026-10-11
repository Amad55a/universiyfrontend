import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadEnv } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8080'

  return {
  plugins: [
    react(),
    tailwindcss()
  ],

  server: {
    host: "localhost",
    port: 5173,
    watch: {
      usePolling: true,
      ignored: ['**/node_modules/**', '**/.git/**']
    },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: false,
        secure: false,
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: false,
        secure: false,
      },
      '/socket.io': {
        target: backendTarget,
        changeOrigin: false,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/app": path.resolve(__dirname, "./src/app"),
      "@/features": path.resolve(__dirname, "./src/features"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/context": path.resolve(__dirname, "./src/context"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/api": path.resolve(__dirname, "./src/api"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/constants": path.resolve(__dirname, "./src/constants"),
      "@/locales": path.resolve(__dirname, "./src/locales"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
      "@/assets": path.resolve(__dirname, "./src/assets"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js'
  }
  }
})

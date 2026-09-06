import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = Number(process.env.BACKEND_PORT || env.BACKEND_PORT || env.PORT || 3002)

  return {
    define: {
      'process.env': {}
    },
    plugins: [react()],
    server: {
      host: true,
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'localhost+2-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'localhost+2.pem')),
      },
      proxy: {
        '/api': {
          target: `https://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: `https://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false
        },
        '/yjs': {
          target: `https://localhost:${backendPort}`,
          ws: true,
          changeOrigin: true,
          secure: false
        },
        '/comms': {
          target: `https://localhost:${backendPort}`,
          ws: true,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})

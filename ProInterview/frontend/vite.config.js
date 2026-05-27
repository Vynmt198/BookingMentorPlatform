import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/** macOS AirPlay thường chiếm :5000 — backend dev mặc định :5001 (xem backend/.env PORT). */
const DEFAULT_DEV_BACKEND = 'http://localhost:5001'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devBackend = (env.VITE_DEV_BACKEND_URL || DEFAULT_DEV_BACKEND).replace(/\/$/, '')

  return {
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    // Giúp Google Identity Services / FedCM giao tiếp popup–tab (tránh COOP chặn postMessage trên dev).
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: devBackend,
        changeOrigin: true,
      },
      '/uploads': {
        target: devBackend,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'lucide': ['lucide-react'],
          'vendor-ui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
          'vendor-graphics': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-viz': ['recharts'],
        }
      }
    }
  },
  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})

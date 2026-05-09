import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/vue-chartjs')) return 'charts';
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/bootstrap') || id.includes('node_modules/@popperjs/core')) return 'bootstrap';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        }
      }
    }
  }
})

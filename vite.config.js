import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        blog: resolve(__dirname, 'blog.html'),
        cart: resolve(__dirname, 'cart.html'),
        orderTracking: resolve(__dirname, 'order-tracking.html'),
        chyawanprash: resolve(__dirname, 'chyawanprash.html'),
        amlaMurabba: resolve(__dirname, 'amla-murabba.html'),
        herbalLipBalm: resolve(__dirname, 'herbal-lip-balm.html')
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});

// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Roteamento obrigatório para o GitHub Pages
  base: '/JB-STORE/', 
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Metrics',
        short_name: 'Metrics',
        theme_color: '#0a0a0a', 
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          {
            src: 'maskable_icon_x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})

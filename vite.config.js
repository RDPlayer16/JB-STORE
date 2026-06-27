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
        name: 'Dashboard Clientes',
        short_name: 'Clientes',
        theme_color: '#0a0a0a', 
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          // Espaço reservado para os ícones futuros
        ]
      }
    })
  ]
})

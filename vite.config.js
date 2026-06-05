// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // OBRIGATÓRIO: Substitua pelo nome exato do seu repositório no GitHub
  base: '/JB-STORE/', 
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // ... (mantenha o resto da sua configuração do PWA)
    })
  ]
})

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dashboard Clientes',
        short_name: 'Clientes',
        theme_color: '#0a0a0a', // Fundo preto da interface
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          // Adicionar seus ícones de 192x192 e 512x512 aqui
        ]
      }
    })
  ]
})
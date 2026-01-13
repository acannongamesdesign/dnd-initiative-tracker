import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: "https://acannongamesdesign.github.io/dnd-initiative-tracker/",
  plugins: [react(), tailwindcss()],
})

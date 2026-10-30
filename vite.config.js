import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // works from any folder or portal path
  server: { port: 5174, strictPort: true }, // 5173 is the Trainer Portal on a dev machine
  plugins: [react()]
})

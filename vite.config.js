import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // works from any folder or portal path
  plugins: [react()]
})

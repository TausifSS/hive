import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Declare process to avoid TypeScript compilation errors during build
declare const process: { env: { VERCEL?: string } };

export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? "/" : "/Hive/",   // 👈 Dynamic base depending on hosting
})

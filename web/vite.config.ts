import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Vite config — ใช้ทั้งตอน `npm run dev` และ Storybook (Storybook อ่าน config นี้อัตโนมัติ)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // ให้ import '@/components/...' ชี้ไปที่ src/
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
});

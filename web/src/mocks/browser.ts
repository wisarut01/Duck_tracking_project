/** MSW ฝั่งเบราว์เซอร์ — main.tsx เปิดใช้เมื่อ `VITE_MSW=true` (`npm run dev:msw`) */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

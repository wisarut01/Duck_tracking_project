import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/index.css';
import { ApiRequestError } from '@/api/client';
import { applyInitialTheme } from '@/lib/useTheme';
import { ToastProvider } from '@/components/ui/Toast';
import { App } from './App';

applyInitialTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx (เช่น 404, 401) ลองใหม่ก็ได้ผลเดิม → ไม่ต้อง retry; network/5xx ลองอีก 2 ครั้ง
      retry: (failureCount, error) =>
        !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});

// `npm run dev:msw` → API ทุกตัวตอบจาก MSW (src/mocks/handlers.ts) ไม่ต้องรัน mock-api
if (import.meta.env.VITE_MSW === 'true') {
  const { worker } = await import('@/mocks/browser');
  await worker.start();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);

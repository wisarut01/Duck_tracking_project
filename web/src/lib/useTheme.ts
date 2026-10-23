import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tb-theme';

/**
 * Hook สลับ light/dark — ใส่/ถอด class "dark" ที่ <html>
 * (CSS variables ใน styles/index.css เปลี่ยนค่าตาม class นี้)
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // ถ้ามีอย่างอื่นเปลี่ยน class (เช่น toolbar ของ Storybook) ให้ state ตามด้วย
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // localStorage อาจใช้ไม่ได้ (private mode) — ไม่เป็นไร
    }
  }, []);

  return { isDark, toggle };
}

/** เรียกครั้งเดียวตอนเปิดแอป (main.tsx) เพื่อใช้ธีมที่เคยเลือกไว้ หรือตาม OS */
export function applyInitialTheme() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', saved ? saved === 'dark' : prefersDark);
}

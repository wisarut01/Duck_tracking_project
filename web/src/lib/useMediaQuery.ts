import { useSyncExternalStore } from 'react';

/** true เมื่อหน้าจอตรงกับ media query เช่น useMediaQuery('(min-width: 768px)') — อัปเดตเองตอนย่อ/ขยายจอ */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** ตรงกับ breakpoint `md` ของ Tailwind (768px) — ต่ำกว่านี้ถือเป็นมือถือ */
export const MD_UP = '(min-width: 768px)';
/** ตรงกับ breakpoint `lg` ของ Tailwind (1024px) */
export const LG_UP = '(min-width: 1024px)';

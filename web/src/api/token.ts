import { useSyncExternalStore } from "react";

/**
 * เก็บ access token (JWT) ไว้ใน localStorage ให้ login ค้างไว้หลัง reload
 * component ที่ใช้ useToken() จะ render ใหม่เองเมื่อ token เปลี่ยน (login / logout / โดน 401)
 */
const STORAGE_KEY = "tb-access-token";
const listeners = new Set<() => void>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode / storage ถูกปิด → ถือว่ายังไม่ได้ login
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // เก็บไม่ได้ก็ไม่เป็นไร — แค่ต้อง login ใหม่หลัง reload
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------- token ที่ยังไม่หมดอายุ (Supabase) ----------

/**
 * token ใน localStorage อาจหมดอายุไปแล้ว เช่น ปิดฝาโน้ตบุ๊ก / สลับแท็บไปนาน
 * (เบราว์เซอร์หยุดตัวจับเวลา refresh ของ Supabase ไว้) supabase.ts ลงทะเบียนตัวนี้ไว้:
 * - fresh:   ขอ token ที่ยังใช้ได้ (หมดอายุ / ใกล้หมด → refresh ก่อนแล้วค่อยคืน)
 * - refresh: บังคับ refresh ตอน API ตอบ 401 (null = refresh ไม่ได้ ต้อง login ใหม่จริง ๆ)
 */
type TokenSource = {
  fresh: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
};
let tokenSource: TokenSource | null = null;

export function setTokenSource(source: TokenSource) {
  tokenSource = source;
}

/** token สำหรับแนบไปกับ request (ไม่มี Supabase = ตัวที่เก็บไว้ตรง ๆ) */
export function getFreshToken(): Promise<string | null> {
  return tokenSource ? tokenSource.fresh() : Promise.resolve(getToken());
}

/** ลอง refresh หลังโดน 401; ไม่มี Supabase = refresh ไม่ได้ (คืน null) */
export function refreshToken(): Promise<string | null> {
  return tokenSource ? tokenSource.refresh() : Promise.resolve(null);
}

// ---------- ออกจากระบบ (กด logout / API ตอบ 401 หรือ 403) ----------

let signOutHook: (() => void) | null = null;
let notice: string | null = null;

/** supabase.ts ลงทะเบียนไว้ เพื่อให้ออกจาก Supabase ด้วย (ไม่งั้นมันจะ refresh token กลับมาให้อีก) */
export function onSignOut(hook: () => void) {
  signOutHook = hook;
}

/** ล้าง session แล้ว RequireAuth จะพาไปหน้า login; reason = ข้อความที่จะโชว์ที่หน้า login */
export function clearSession(reason?: string) {
  notice = reason ?? null;
  setToken(null);
  signOutHook?.();
}

/** ข้อความจาก clearSession ครั้งล่าสุด (อ่านแล้วหายไป) */
export function takeSessionNotice(): string | null {
  const message = notice;
  notice = null;
  return message;
}

/** token ปัจจุบัน (null = ยังไม่ได้ login) */
export function useToken() {
  return useSyncExternalStore(subscribe, getToken);
}

import { useSyncExternalStore } from 'react';

/**
 * เก็บ access token (JWT) ไว้ใน localStorage ให้ login ค้างไว้หลัง reload
 * component ที่ใช้ useToken() จะ render ใหม่เองเมื่อ token เปลี่ยน (login / logout / โดน 401)
 */
const STORAGE_KEY = 'tb-access-token';
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

/** token ปัจจุบัน (null = ยังไม่ได้ login) */
export function useToken() {
  return useSyncExternalStore(subscribe, getToken);
}

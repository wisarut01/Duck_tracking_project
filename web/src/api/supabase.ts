import { createClient } from "@supabase/supabase-js";
import { onSignOut, setToken } from "./token";

/**
 * Login ด้วย Google ผ่าน Supabase Auth — เปิดใช้เมื่อตั้ง env สองตัวนี้ (บน Vercel)
 *   VITE_SUPABASE_URL              https://<ref>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  Project Settings → API Keys (publishable / anon key, ไม่ใช่ความลับ)
 * ไม่ตั้ง = login ด้วยอีเมล/รหัสผ่านแบบเดิม (บนเครื่อง และตอนรันเทสต์)
 *
 * Supabase เก็บ session เองและ refresh access token ให้ทุกชั่วโมง เราแค่คอยคัดลอก
 * access token ล่าสุดไปไว้ใน token store เดิม client.ts จึงส่ง Bearer ได้เหมือนเดิม
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const supabase = url && key ? createClient(url, key) : null;

export const googleSignInEnabled = supabase !== null;

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) =>
    setToken(session?.access_token ?? null),
  );
  onSignOut(() => void supabase.auth.signOut());
}

/** ไปหน้า login ของ Google แล้วกลับมาที่ /login?next=… (LoginPage จะพาต่อไปหน้าเดิมเอง) */
export async function signInWithGoogle(next: string) {
  if (!supabase) return;
  const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

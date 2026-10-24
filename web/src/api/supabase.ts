import { createClient, type AuthError } from "@supabase/supabase-js";
import { onSignOut, setToken } from "./token";

/**
 * Login ผ่าน Supabase Auth (Google หรืออีเมล/รหัสผ่าน) — เปิดใช้เมื่อตั้ง env สองตัวนี้ (บน Vercel)
 *   VITE_SUPABASE_URL              https://<ref>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  Project Settings → API Keys (publishable / anon key, ไม่ใช่ความลับ)
 * ไม่ตั้ง = login ด้วยอีเมล/รหัสผ่านผ่าน API ของเราเอง (บนเครื่อง และตอนรันเทสต์)
 *
 * Supabase เก็บ session เองและ refresh access token ให้ทุกชั่วโมง เราแค่คอยคัดลอก
 * access token ล่าสุดไปไว้ใน token store เดิม client.ts จึงส่ง Bearer ได้เหมือนเดิม
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const supabase = url && key ? createClient(url, key) : null;

export const supabaseAuthEnabled = supabase !== null;

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) =>
    setToken(session?.access_token ?? null),
  );
  onSignOut(() => void supabase.auth.signOut());
}

/** URL ที่ Supabase พากลับมา: /login?next=… (LoginPage จะพาต่อไปหน้าเดิมเอง) */
function returnUrl(next: string) {
  return `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
}

/** ไปหน้า login ของ Google แล้วกลับมาที่ returnUrl */
export async function signInWithGoogle(next: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: returnUrl(next) },
  });
  if (error) throw error;
}

/** สำเร็จ = onAuthStateChange เก็บ token ให้ แล้ว LoginPage พาไปหน้าถัดไปเอง */
export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * สมัครด้วยอีเมล/รหัสผ่าน ชื่อที่แสดงเก็บใน user_metadata.full_name (auth-service อ่านจากตรงนี้)
 * - "signed-in"     Supabase ไม่ได้บังคับยืนยันอีเมล → login เลย
 * - "confirm-email" ต้องกดลิงก์ในอีเมลก่อน (ลิงก์พากลับมาที่ returnUrl แล้ว login ให้เอง)
 */
export async function signUpWithPassword(
  request: { email: string; password: string; displayName: string },
  next: string,
): Promise<"signed-in" | "confirm-email"> {
  if (!supabase) return "signed-in";
  const { data, error } = await supabase.auth.signUp({
    email: request.email,
    password: request.password,
    options: {
      data: { full_name: request.displayName },
      emailRedirectTo: returnUrl(next),
    },
  });
  if (error) throw error;
  // อีเมลนี้มีบัญชีแล้ว: Supabase ไม่ตอบ error (กันการเดาอีเมล) แต่ identities จะว่าง
  if (data.user && data.user.identities?.length === 0) {
    throw new Error(
      "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบ (หรือเข้าด้วย Google) แทน",
    );
  }
  return data.session ? "signed-in" : "confirm-email";
}

/** แปลง error ของ Supabase Auth เป็นภาษาไทย; ไม่รู้จัก = undefined */
export function supabaseErrorMessage(error: unknown): string | undefined {
  const code = (error as Partial<AuthError> | null)?.code;
  switch (code) {
    case "invalid_credentials":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "email_not_confirmed":
      return "ยังไม่ได้ยืนยันอีเมล — กดลิงก์ในอีเมลที่ส่งไปตอนสมัครก่อน";
    case "user_already_exists":
    case "email_exists":
      return "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทน";
    case "weak_password":
      return "รหัสผ่านง่ายเกินไป ลองตั้งให้ยาวขึ้นหรือผสมตัวเลข";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "ส่งคำขอถี่เกินไป รอสักครู่แล้วลองใหม่";
    case "email_provider_disabled":
      return "ยังไม่ได้เปิด login ด้วยอีเมลใน Supabase — ใช้ Google ไปก่อน";
    default:
      return undefined;
  }
}

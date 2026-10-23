import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { ApiRequestError, errorMessage } from "@/api/client";
import { useLoginMutation, useRegisterMutation } from "@/api/queries";
import { googleSignInEnabled, signInWithGoogle } from "@/api/supabase";
import { takeSessionNotice, useToken } from "@/api/token";
import { LoginScreen } from "@/screens/LoginScreen";

/** แปลง error จาก API เป็นข้อความภาษาไทยที่ผู้ใช้เข้าใจ */
function authErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (error.status === 409) return "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทน";
  }
  return errorMessage(error);
}

/** กลับไปหน้าเดิมหลัง login — รับเฉพาะ path ในแอป (กันลิงก์ ?next=https://เว็บอื่น) */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginPage() {
  const token = useToken();
  const [params] = useSearchParams();
  const login = useLoginMutation();
  const register = useRegisterMutation();
  // เช่น "x@gmail.com is not allowed…" จาก API ที่ทำให้ต้องออกจากระบบ (อ่านครั้งเดียวตอนเปิดหน้า)
  const [notice] = useState(takeSessionNotice);
  const [googleError, setGoogleError] = useState<unknown>(null);

  // login สำเร็จ → token ถูกเก็บ → render ใหม่แล้วเข้าเงื่อนไขนี้
  if (token) return <Navigate to={safeNext(params.get("next"))} replace />;

  const error = login.error ?? register.error ?? googleError;
  return (
    <LoginScreen
      loading={login.isPending || register.isPending}
      error={error ? authErrorMessage(error) : (notice ?? undefined)}
      // production (ตั้ง VITE_SUPABASE_*): Google อย่างเดียว; บนเครื่อง / เทสต์: อีเมล + รหัสผ่าน
      passwordSignIn={!googleSignInEnabled}
      onGoogleSignIn={
        googleSignInEnabled
          ? () => {
              setGoogleError(null);
              signInWithGoogle(safeNext(params.get("next"))).catch(
                setGoogleError,
              );
            }
          : undefined
      }
      onLogin={(request) => {
        register.reset();
        login.mutate(request);
      }}
      onRegister={(request) => {
        login.reset();
        register.mutate(request);
      }}
    />
  );
}

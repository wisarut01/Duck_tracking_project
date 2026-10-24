import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, errorMessage } from "@/api/client";
import { useLoginMutation, useRegisterMutation } from "@/api/queries";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  supabaseAuthEnabled,
  supabaseErrorMessage,
} from "@/api/supabase";
import { takeSessionNotice, useToken } from "@/api/token";
import type { LoginRequest, RegisterRequest } from "@/types/api";
import { LoginScreen } from "@/screens/LoginScreen";

/** แปลง error จาก API / Supabase เป็นข้อความภาษาไทยที่ผู้ใช้เข้าใจ */
function authErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (error.status === 409) return "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทน";
  }
  return supabaseErrorMessage(error) ?? errorMessage(error);
}

/** กลับไปหน้าเดิมหลัง login — รับเฉพาะ path ในแอป (กันลิงก์ ?next=https://เว็บอื่น) */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * อีเมล/รหัสผ่าน: production (ตั้ง VITE_SUPABASE_*) ใช้ Supabase Auth คู่กับ Google;
 * บนเครื่อง / เทสต์ ใช้ /auth/login กับ /auth/register ของ API เราเอง
 */
function usePasswordAuth(next: string) {
  const queryClient = useQueryClient();
  const apiLogin = useLoginMutation();
  const apiRegister = useRegisterMutation();
  const supabaseLogin = useMutation({
    mutationFn: (request: LoginRequest) =>
      signInWithPassword(request.email, request.password),
    onSuccess: () => queryClient.clear(),
  });
  const supabaseRegister = useMutation({
    mutationFn: (request: RegisterRequest) => signUpWithPassword(request, next),
    onSuccess: () => queryClient.clear(),
  });
  return supabaseAuthEnabled
    ? { login: supabaseLogin, register: supabaseRegister }
    : { login: apiLogin, register: apiRegister };
}

export function LoginPage() {
  const token = useToken();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { login, register } = usePasswordAuth(next);
  // เช่น "x@gmail.com is not allowed…" จาก API ที่ทำให้ต้องออกจากระบบ (อ่านครั้งเดียวตอนเปิดหน้า)
  const [notice] = useState(takeSessionNotice);
  const [googleError, setGoogleError] = useState<unknown>(null);

  // login สำเร็จ → token ถูกเก็บ → render ใหม่แล้วเข้าเงื่อนไขนี้
  if (token) return <Navigate to={next} replace />;

  const error = login.error ?? register.error ?? googleError;
  const confirmEmail =
    register.data === "confirm-email" && register.variables
      ? `ส่งลิงก์ยืนยันไปที่ ${register.variables.email} แล้ว กดลิงก์ในอีเมลเพื่อเข้าใช้งาน (ถ้าไม่เจอ ลองดูใน Spam)`
      : undefined;
  return (
    <LoginScreen
      loading={login.isPending || register.isPending}
      error={error ? authErrorMessage(error) : (notice ?? undefined)}
      info={confirmEmail}
      onGoogleSignIn={
        supabaseAuthEnabled
          ? () => {
              setGoogleError(null);
              signInWithGoogle(next).catch(setGoogleError);
            }
          : undefined
      }
      onLogin={(request) => {
        register.reset();
        setGoogleError(null);
        login.mutate(request);
      }}
      onRegister={(request) => {
        login.reset();
        setGoogleError(null);
        register.mutate(request);
      }}
    />
  );
}

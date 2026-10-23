import { useState, type FormEvent } from 'react';
import { Lock, Mail, User as UserIcon } from 'lucide-react';
import type { LoginRequest, RegisterRequest } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/layout/Logo';

export interface LoginScreenProps {
  /** login = POST /auth/login, register = POST /auth/register */
  defaultMode?: 'login' | 'register';
  onLogin?: (request: LoginRequest) => void;
  onRegister?: (request: RegisterRequest) => void;
  loading?: boolean;
  /** เช่น "invalid or expired token" / "อีเมลหรือรหัสผ่านไม่ถูกต้อง" */
  error?: string;
}

/** หน้า Login / Register บนพื้น whiteboard พร้อม sticky note ตกแต่ง */
export function LoginScreen({ defaultMode = 'login', onLogin, onRegister, loading = false, error }: LoginScreenProps) {
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tried, setTried] = useState(false);

  const isRegister = mode === 'register';
  const errors = {
    email: !/^\S+@\S+\.\S+$/.test(email) ? 'กรุณาใส่อีเมลให้ถูกต้อง' : undefined,
    password: isRegister && password.length < 8 ? 'อย่างน้อย 8 ตัวอักษร' : !password ? 'กรุณาใส่รหัสผ่าน' : undefined,
    displayName: isRegister && !displayName.trim() ? 'กรุณาใส่ชื่อที่แสดง' : undefined,
  };
  const hasError = Object.values(errors).some(Boolean);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (hasError) return;
    if (isRegister) onRegister?.({ email, password, displayName: displayName.trim() });
    else onLogin?.({ email, password });
  }

  return (
    <div className="bg-dot-grid relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* sticky notes ตกแต่ง (aria-hidden เพราะไม่มีความหมาย) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <StickyDeco className="top-[12%] left-[10%] -rotate-6 bg-sticky-yellow text-sticky-yellow-ink" text="วางแผน sprint หน้า ✏️" />
        <StickyDeco className="top-[58%] left-[14%] rotate-3 bg-sticky-pink text-sticky-pink-ink" text="Bug: login ช้า 🐞" />
        <StickyDeco className="top-[18%] right-[11%] rotate-6 bg-sticky-green text-sticky-green-ink" text="Docs: Board Spec 📄" />
        <StickyDeco className="right-[15%] bottom-[14%] -rotate-3 bg-sticky-blue text-sticky-blue-ink" text="TB-12 → In review" />
      </div>

      <main className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-extrabold text-ink">{isRegister ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา 👋'}</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">
          {isRegister ? 'เริ่มจัดการงานและเอกสารของทีมในที่เดียว' : 'เข้าสู่ระบบเพื่อดู board และ docs ของทีม'}
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {isRegister && (
            <Input
              label="ชื่อที่แสดง"
              leftIcon={<UserIcon size={16} />}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              error={tried ? errors.displayName : undefined}
              maxLength={50}
              autoComplete="nickname"
              placeholder="Duck"
            />
          )}
          <Input
            label="อีเมล"
            type="email"
            leftIcon={<Mail size={16} />}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={tried ? errors.email : undefined}
            autoComplete="email"
            placeholder="duck@example.com"
          />
          <Input
            label="รหัสผ่าน"
            type="password"
            leftIcon={<Lock size={16} />}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={tried ? errors.password : undefined}
            hint={isRegister ? 'อย่างน้อย 8 ตัวอักษร' : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            {isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          {isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setTried(false);
            }}
            className="font-bold text-link hover:underline"
          >
            {isRegister ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </p>
      </main>
    </div>
  );
}

function StickyDeco({ text, className }: { text: string; className: string }) {
  return (
    <div className={`absolute flex h-32 w-40 items-center justify-center rounded-lg p-4 text-center text-sm font-bold shadow-md ${className}`}>
      {text}
    </div>
  );
}

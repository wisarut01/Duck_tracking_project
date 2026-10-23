import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { colorForLabel } from './Badge';
import { stickyClasses } from '@/lib/issueMeta';
import type { User } from '@/types/api';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** ใช้แค่ชื่อกับรูป — `Pick` เลือกเฉพาะ field ที่ต้องการจาก type User */
  user: Pick<User, 'displayName' | 'avatarUrl'> | null | undefined;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-11 w-11 text-sm',
};

/** รูปโปรไฟล์ — ถ้าไม่มีรูปจะแสดงตัวย่อบนพื้นพาสเทล, ถ้าไม่มี user แสดงวงกลมเส้นประ (= Unassigned) */
export function Avatar({ user, size = 'md', className }: AvatarProps) {
  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-surface select-none',
    sizeClasses[size],
    className,
  );

  if (!user) {
    return (
      <span
        className={cn(base, 'border border-dashed border-border-strong bg-surface text-ink-subtle')}
        role="img"
        aria-label="ยังไม่มอบหมาย (Unassigned)"
        title="Unassigned"
      >
        ?
      </span>
    );
  }

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.displayName} title={user.displayName} className={cn(base, 'object-cover')} />;
  }

  const sticky = stickyClasses[colorForLabel(user.displayName)];
  return (
    <span className={cn(base, sticky.bg, sticky.ink)} role="img" aria-label={user.displayName} title={user.displayName}>
      {initials(user.displayName)}
    </span>
  );
}

export interface AvatarGroupProps {
  users: Pick<User, 'id' | 'displayName' | 'avatarUrl'>[];
  /** แสดงสูงสุดกี่คน ที่เหลือรวมเป็น "+N" */
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 3, size = 'md' }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const hiddenCount = users.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.id} user={user} size={size} />
      ))}
      {hiddenCount > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-surface-muted font-bold text-ink-muted ring-2 ring-surface',
            sizeClasses[size],
          )}
          aria-label={`และอีก ${hiddenCount} คน`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

import { cn } from '@/lib/cn';

export interface SkeletonProps {
  /** text = แท่งบางๆ, circle = วงกลม (avatar), rect = กล่อง (การ์ด) */
  shape?: 'text' | 'circle' | 'rect';
  /** ใช้ class Tailwind กำหนดขนาด เช่น "h-4 w-32" */
  className?: string;
}

/** กล่องกระพริบระหว่างรอข้อมูล — aria-hidden เพราะ screen reader ควรได้ยินแค่ "กำลังโหลด" จาก parent */
export function Skeleton({ shape = 'text', className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'animate-shimmer block',
        shape === 'text' && 'h-3.5 w-full rounded-full',
        shape === 'circle' && 'h-8 w-8 rounded-full',
        shape === 'rect' && 'h-24 w-full rounded-lg',
        className,
      )}
    />
  );
}

/** โครงการ์ด issue ระหว่างโหลด board */
export function IssueCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm" aria-hidden>
      <Skeleton className="w-4/5" />
      <Skeleton className="w-1/2" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton shape="circle" className="h-6 w-6" />
      </div>
    </div>
  );
}

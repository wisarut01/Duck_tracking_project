import { CircleAlert, SearchX } from 'lucide-react';
import { ApiRequestError, errorMessage } from '@/api/client';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

/** ระหว่างรอข้อมูลก้อนแรกของหน้า */
export function LoadingScreen() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-6" role="status" aria-label="กำลังโหลด">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="mt-4 h-64 w-full rounded-xl" />
      </div>
    </AppShell>
  );
}

/** โหลดไม่สำเร็จ: 404 = ไม่มีของนี้, อย่างอื่น = ให้ลองใหม่ */
export function ErrorScreen({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const notFound = error instanceof ApiRequestError && error.status === 404;
  return (
    <AppShell>
      <EmptyState
        className="mt-16"
        icon={notFound ? SearchX : CircleAlert}
        title={notFound ? 'ไม่พบหน้าที่ต้องการ' : 'โหลดข้อมูลไม่สำเร็จ'}
        description={errorMessage(error)}
        action={
          !notFound && onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              ลองใหม่
            </Button>
          ) : undefined
        }
      />
    </AppShell>
  );
}

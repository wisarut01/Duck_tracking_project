import { Kanban } from 'lucide-react';
import { Navigate } from 'react-router';
import { useProjects } from '@/api/queries';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorScreen, LoadingScreen } from './StatusScreens';

/** หน้า "/" → ไป board ของ project แรก */
export function HomePage() {
  const projects = useProjects();
  if (projects.error) return <ErrorScreen error={projects.error} onRetry={() => void projects.refetch()} />;
  if (!projects.data) return <LoadingScreen />;

  const first = projects.data[0];
  if (first) return <Navigate to={`/projects/${first.key}/board`} replace />;
  return (
    <AppShell>
      <EmptyState className="mt-16" icon={Kanban} title="ยังไม่มี project" description="สร้าง project แรกผ่าน API (POST /projects) แล้วกลับมาที่หน้านี้" />
    </AppShell>
  );
}

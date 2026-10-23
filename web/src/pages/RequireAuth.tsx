import { Navigate, Outlet, useLocation } from 'react-router';
import { useToken } from '@/api/token';
import { ApiAppDataProvider } from './ApiAppDataProvider';

/**
 * ครอบทุกหน้าที่ต้อง login: ไม่มี token → ไปหน้า /login?next=<หน้าเดิม>
 * (ถ้า API ตอบ 401 ระหว่างใช้งาน client.ts จะล้าง token แล้วตัวนี้พาไป login เอง)
 */
export function RequireAuth() {
  const token = useToken();
  const location = useLocation();
  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return (
    <ApiAppDataProvider>
      <Outlet />
    </ApiAppDataProvider>
  );
}

import { Navigate, Route, Routes } from 'react-router';
import { BoardPage } from '@/pages/BoardPage';
import { DocsPage } from '@/pages/DocsPage';
import { HomePage } from '@/pages/HomePage';
import { IssuePage } from '@/pages/IssuePage';
import { LoginPage } from '@/pages/LoginPage';
import { RequireAuth } from '@/pages/RequireAuth';
import { SearchPage } from '@/pages/SearchPage';

/**
 * เส้นทางทั้งหมดของแอป
 * src/pages/*  = ดึงข้อมูลจาก API (react-query) แล้วส่งให้
 * src/screens/* = หน้าตาอย่างเดียว (ใช้ใน Storybook ด้วย fixtures ได้)
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects/:projectKey/board" element={<BoardPage />} />
        <Route path="/issues/:issueKey" element={<IssuePage />} />
        <Route path="/spaces/:spaceKey" element={<DocsPage />} />
        <Route path="/spaces/:spaceKey/pages/:pageId" element={<DocsPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

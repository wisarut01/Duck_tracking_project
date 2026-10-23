import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/index.css';
import { applyInitialTheme } from '@/lib/useTheme';
import { LoginScreen } from '@/screens/LoginScreen';
import { ProjectBoardScreen } from '@/screens/ProjectBoardScreen';
import { IssueDetailScreen } from '@/screens/IssueDetailScreen';
import { DocsPageScreen } from '@/screens/DocsPageScreen';
import { SearchResultsScreen } from '@/screens/SearchResultsScreen';
import {
  commentsTB12,
  issues,
  issueTB12,
  linkedIssuesBoardSpec,
  linkedPagesTB12,
  pageBoardSpec,
  pageTree,
  projectTB,
  spaceENG,
} from '@/mocks/fixtures';

/*
 * Phase 1: แอปจริงยังใช้ mock data (fixtures) — โครง router + react-query พร้อมไว้แล้ว
 * Phase 2: เปลี่ยน fixtures เป็น useQuery(...) ที่เรียก api/openapi.yaml
 */
applyInitialTheme();
const queryClient = new QueryClient();

// `npm run dev:msw` → API ทุกตัวตอบจาก MSW (src/mocks/handlers.ts) ไม่ต้องรัน mock-api
if (import.meta.env.VITE_MSW === 'true') {
  const { worker } = await import('@/mocks/browser');
  await worker.start();
}

function IssueRoute() {
  const { issueKey } = useParams();
  const issue = issues.find((item) => item.key === issueKey) ?? issueTB12;
  return (
    <IssueDetailScreen
      key={issue.key}
      issue={issue}
      comments={issue.key === 'TB-12' ? commentsTB12 : []}
      linkedPages={issue.key === 'TB-12' ? linkedPagesTB12 : []}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/projects/TB/board" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/projects/:projectKey/board" element={<ProjectBoardScreen project={projectTB} issues={issues} />} />
          <Route path="/issues/:issueKey" element={<IssueRoute />} />
          <Route
            path="/spaces/:spaceKey/*"
            element={<DocsPageScreen space={spaceENG} tree={pageTree} page={pageBoardSpec} linkedIssues={linkedIssuesBoardSpec} />}
          />
          <Route path="/search" element={<SearchResultsScreen defaultQuery="board" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

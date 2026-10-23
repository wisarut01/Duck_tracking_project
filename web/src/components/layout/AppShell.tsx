import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAppData } from '@/lib/appData';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/useTheme';
import type { IssueSummary, PageSummary } from '@/types/api';
import { CommandPalette } from '@/components/search/CommandPalette';
import { CreateProjectModal } from './CreateProjectModal';
import { Sidebar, type SidebarProps } from './Sidebar';
import { TopBar, type TopBarProps } from './TopBar';

export interface AppShellProps {
  /** props ของ Sidebar — projects, spaces, currentUser, onLogout มาจาก AppData ถ้าไม่ได้ส่งมา */
  sidebar?: Partial<SidebarProps>;
  breadcrumbs?: TopBarProps['breadcrumbs'];
  onCreate?: () => void;
  /** เลือก issue จาก ⌘K — ไม่ส่งมา = ไปหน้า /issues/{key} */
  onSelectIssue?: (issue: IssueSummary) => void;
  /** เลือกหน้าจาก ⌘K — ไม่ส่งมา = ไปหน้า /spaces/{key}/pages/{id} */
  onSelectPage?: (page: PageSummary) => void;
  /** true = พื้นหลังแบบ dot-grid (ใช้กับ board), false = พื้นเรียบ (ใช้กับ docs) */
  canvas?: boolean;
  /** เปิด command palette ไว้ตั้งแต่แรก (ใช้ใน Storybook) */
  defaultSearchOpen?: boolean;
  defaultSearchQuery?: string;
  children: ReactNode;
}

/**
 * โครงหน้าหลักของแอป: Sidebar ซ้าย + TopBar บน + เนื้อหา
 * จัดการ ⌘K / Ctrl+K เปิดค้นหา (ผลค้นหามาจาก AppData) และปุ่มสลับธีมให้เอง
 */
export function AppShell({
  sidebar,
  breadcrumbs,
  onCreate,
  onSelectIssue,
  onSelectPage,
  canvas = false,
  defaultSearchOpen = false,
  defaultSearchQuery = '',
  children,
}: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(defaultSearchOpen);
  const [query, setQuery] = useState(defaultSearchQuery);
  const [collapsed, setCollapsed] = useState(sidebar?.collapsed ?? false);
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const { projects, spaces, currentUser, onLogout, onCreateProject, onCreateSpace, useSearch } = useAppData();
  // ฟอร์มสร้าง project / space ที่เปิดอยู่ (count เปลี่ยนทุกครั้งที่เปิด → ฟอร์มเริ่มว่างใหม่)
  const [creating, setCreating] = useState<{ kind: 'project' | 'space'; count: number }>();
  const search = useSearch(searchOpen ? query : ''); // ค้นเฉพาะตอน palette เปิด

  // คีย์ลัด ⌘K / Ctrl+K เปิดค้นหาจากทุกที่
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeSearch = () => setSearchOpen(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas text-ink">
      <Sidebar
        projects={projects}
        spaces={spaces}
        currentUser={currentUser}
        onLogout={onLogout}
        onCreateProject={onCreateProject && (() => setCreating({ kind: 'project', count: (creating?.count ?? 0) + 1 }))}
        onCreateSpace={onCreateSpace && (() => setCreating({ kind: 'space', count: (creating?.count ?? 0) + 1 }))}
        {...sidebar}
        collapsed={collapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          breadcrumbs={breadcrumbs}
          onOpenSearch={() => setSearchOpen(true)}
          onCreate={onCreate}
          onToggleTheme={toggle}
          isDark={isDark}
          onToggleSidebar={() => setCollapsed((value) => !value)}
        />
        <main className={cn('min-h-0 flex-1 overflow-auto', canvas ? 'bg-dot-grid' : 'bg-canvas')}>{children}</main>
      </div>

      <CommandPalette
        open={searchOpen}
        onClose={closeSearch}
        query={query}
        onQueryChange={setQuery}
        results={search.results}
        loading={search.loading}
        onSelectIssue={(issue) => {
          if (onSelectIssue) onSelectIssue(issue);
          else navigate(`/issues/${issue.key}`);
          closeSearch();
        }}
        onSelectPage={(page) => {
          if (onSelectPage) onSelectPage(page);
          else navigate(`/spaces/${page.spaceKey}/pages/${page.id}`);
          closeSearch();
        }}
      />

      {creating && (
        <CreateProjectModal
          key={creating.count}
          kind={creating.kind}
          open
          onClose={() => setCreating(undefined)}
          onSubmit={(request) => (creating.kind === 'project' ? onCreateProject?.(request) : onCreateSpace?.(request))}
        />
      )}
    </div>
  );
}

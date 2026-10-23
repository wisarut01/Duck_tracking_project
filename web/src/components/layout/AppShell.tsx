import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/useTheme';
import type { IssueSummary, PageSummary, SearchResult } from '@/types/api';
import { CommandPalette } from '@/components/search/CommandPalette';
import { Sidebar, type SidebarProps } from './Sidebar';
import { TopBar, type TopBarProps } from './TopBar';

export interface AppShellProps {
  /** props ที่ส่งต่อให้ Sidebar ตรงๆ */
  sidebar: SidebarProps;
  breadcrumbs?: TopBarProps['breadcrumbs'];
  onCreate?: () => void;
  /** ฟังก์ชันค้นหา (Phase 2: แทนด้วย react-query เรียก GET /search) */
  search?: (query: string) => SearchResult;
  onSelectIssue?: (issue: IssueSummary) => void;
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
 * จัดการ ⌘K / Ctrl+K เปิดค้นหา และปุ่มสลับธีมให้เอง
 */
export function AppShell({
  sidebar,
  breadcrumbs,
  onCreate,
  search,
  onSelectIssue,
  onSelectPage,
  canvas = false,
  defaultSearchOpen = false,
  defaultSearchQuery = '',
  children,
}: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(defaultSearchOpen);
  const [query, setQuery] = useState(defaultSearchQuery);
  const [collapsed, setCollapsed] = useState(sidebar.collapsed ?? false);
  const { isDark, toggle } = useTheme();

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
      <Sidebar {...sidebar} collapsed={collapsed} />
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
        results={search && query.trim() ? search(query) : null}
        onSelectIssue={(issue) => {
          onSelectIssue?.(issue);
          closeSearch();
        }}
        onSelectPage={(page) => {
          onSelectPage?.(page);
          closeSearch();
        }}
      />
    </div>
  );
}

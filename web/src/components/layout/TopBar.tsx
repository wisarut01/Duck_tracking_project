import type { ReactNode } from 'react';
import { Moon, PanelLeft, Plus, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { SearchBar } from '@/components/search/SearchBar';

export interface TopBarProps {
  /** breadcrumb เช่น "Tracking Board / Board" */
  breadcrumbs?: { label: string; to?: string }[];
  onOpenSearch: () => void;
  onCreate?: () => void;
  /** สลับ light/dark — ถ้าไม่ส่งมาจะไม่แสดงปุ่ม */
  onToggleTheme?: () => void;
  isDark?: boolean;
  onToggleSidebar?: () => void;
  /** ปุ่มเสริมด้านขวา */
  actions?: ReactNode;
}

/** แถบบน: breadcrumb · ช่องค้นหา · ปุ่ม Create · สลับธีม */
export function TopBar({ breadcrumbs = [], onOpenSearch, onCreate, onToggleTheme, isDark = false, onToggleSidebar, actions }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md">
      {onToggleSidebar && (
        <Button variant="ghost" size="sm" iconOnly aria-label="ย่อ/ขยายเมนู" onClick={onToggleSidebar}>
          <PanelLeft size={18} aria-hidden />
        </Button>
      )}

      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
          <ol className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={isLast ? 'truncate font-bold text-ink' : 'truncate text-ink-muted'}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                  {!isLast && <span className="text-ink-subtle" aria-hidden>/</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-1 justify-center px-2">
        <SearchBar onOpen={onOpenSearch} />
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {onToggleTheme && (
          <Tooltip content={isDark ? 'Light mode' : 'Dark mode'} side="bottom">
            <Button variant="ghost" size="sm" iconOnly aria-label="สลับธีม light/dark" aria-pressed={isDark} onClick={onToggleTheme}>
              {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </Button>
          </Tooltip>
        )}
        {onCreate && (
          <Button size="sm" leftIcon={<Plus size={16} aria-hidden />} onClick={onCreate}>
            Create
          </Button>
        )}
      </div>
    </header>
  );
}

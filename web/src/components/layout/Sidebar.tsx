import type { ReactNode } from 'react';
import { BookText, Kanban, LogOut, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import type { Project, Space, User } from '@/types/api';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from './Logo';

export interface SidebarProps {
  projects: Project[];
  spaces: Space[];
  activeProjectKey?: string;
  activeSpaceKey?: string;
  currentUser?: User;
  onCreateProject?: () => void;
  onCreateSpace?: () => void;
  onLogout?: () => void;
  /** แสดงแบบแคบ (ไอคอนอย่างเดียว) */
  collapsed?: boolean;
}

/** แถบซ้าย: โลโก้ → Projects → Spaces → ผู้ใช้ */
export function Sidebar({
  projects,
  spaces,
  activeProjectKey,
  activeSpaceKey,
  currentUser,
  onCreateProject,
  onCreateSpace,
  onLogout,
  collapsed = false,
}: SidebarProps) {
  return (
    <nav
      aria-label="เมนูหลัก"
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width]',
        collapsed ? 'w-16 items-center' : 'w-64',
      )}
    >
      <Link to="/" className={cn('flex h-16 items-center', collapsed ? 'justify-center' : 'px-5')}>
        <Logo showText={!collapsed} />
      </Link>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <SidebarSection title="Projects" collapsed={collapsed} onAdd={onCreateProject} addLabel="สร้าง project">
          {projects.map((project) => (
            <SidebarItem
              key={project.id}
              to={`/projects/${project.key}/board`}
              active={project.key === activeProjectKey}
              collapsed={collapsed}
              label={project.name}
              icon={<KeyChip text={project.key} active={project.key === activeProjectKey} />}
              meta={project.issueCount !== undefined ? String(project.issueCount) : undefined}
              trailingIcon={<Kanban size={14} aria-hidden />}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Spaces" collapsed={collapsed} onAdd={onCreateSpace} addLabel="สร้าง space">
          {spaces.map((space) => (
            <SidebarItem
              key={space.id}
              to={`/spaces/${space.key}`}
              active={space.key === activeSpaceKey}
              collapsed={collapsed}
              label={space.name}
              icon={
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sticky-yellow text-sticky-yellow-ink">
                  <BookText size={14} aria-hidden />
                </span>
              }
              meta={space.key}
            />
          ))}
        </SidebarSection>
      </div>

      {currentUser && (
        <div className={cn('flex items-center gap-2 border-t border-border p-3', collapsed && 'flex-col')}>
          <Avatar user={currentUser} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{currentUser.displayName}</p>
              <p className="truncate text-xs text-ink-subtle">{currentUser.email}</p>
            </div>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              className="rounded-lg p-2 text-ink-subtle hover:bg-surface-muted hover:text-ink"
            >
              <LogOut size={16} aria-hidden />
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

function SidebarSection({
  title,
  collapsed,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  collapsed: boolean;
  onAdd?: () => void;
  addLabel: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-0.5">
      {!collapsed && (
        <div className="mb-1 flex items-center justify-between px-2">
          <h2 className="text-xs font-bold tracking-wide text-ink-subtle uppercase">{title}</h2>
          {onAdd && (
            <button type="button" onClick={onAdd} aria-label={addLabel} className="rounded-md p-1 text-ink-subtle hover:bg-surface-muted hover:text-ink">
              <Plus size={14} aria-hidden />
            </button>
          )}
        </div>
      )}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

interface SidebarItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  collapsed: boolean;
  meta?: string;
  trailingIcon?: ReactNode;
}

function SidebarItem({ to, label, icon, active, collapsed, meta, trailingIcon }: SidebarItemProps) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          'group relative flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-semibold transition-colors',
          active ? 'bg-brand-soft text-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
          collapsed && 'justify-center px-0',
        )}
      >
        {/* แถบเหลืองด้านซ้ายบอกว่าเป็นหน้าปัจจุบัน (ไม่ใช่แค่สีพื้น) */}
        {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-full bg-brand" aria-hidden />}
        {icon}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {trailingIcon && <span className="text-ink-subtle opacity-0 group-hover:opacity-100">{trailingIcon}</span>}
            {meta && <span className="text-xs font-bold text-ink-subtle">{meta}</span>}
          </>
        )}
      </Link>
    </li>
  );
}

function KeyChip({ text, active }: { text: string; active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-[10px] font-extrabold',
        active ? 'bg-brand text-brand-ink' : 'bg-sticky-gray text-sticky-gray-ink',
      )}
      aria-hidden
    >
      {text}
    </span>
  );
}

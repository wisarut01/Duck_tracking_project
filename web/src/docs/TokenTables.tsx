import { useEffect, useState } from 'react';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from '@/types/api';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { StatusPill } from '@/components/issues/StatusPill';
import { issuePriorityMeta, issueStatusMeta, issueTypeMeta } from '@/lib/issueMeta';

/*
 * Component สำหรับหน้า "Design Tokens" (MDX) — อ่านค่าสีจริงจาก CSS variables
 * จึงแสดงค่า light/dark ตามธีมที่เลือกบน toolbar เสมอ (ไม่ต้องเขียน hex ซ้ำ)
 */

/** อ่านค่า CSS variable จาก <html> และอัปเดตเมื่อสลับธีม */
function useCssVar(name: string): string {
  const read = () => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [value, setValue] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setValue(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return value;
}

/**
 * ปุ่มสลับ Light/Dark สำหรับหน้า MDX (หน้า docs ไม่ได้ผ่าน decorator ธีมของ toolbar)
 * สลับ class "dark" ที่ <html> → swatch ทุกอันอ่านค่าใหม่เอง
 */
export function ThemeSwitch() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  function set(next: boolean) {
    document.documentElement.classList.toggle('dark', next);
    setIsDark(next);
  }
  return (
    <div role="radiogroup" aria-label="ธีมของหน้านี้" className="not-prose my-4 inline-flex rounded-xl border border-border bg-surface-muted p-1">
      {[false, true].map((dark) => (
        <button
          key={String(dark)}
          type="button"
          role="radio"
          aria-checked={isDark === dark}
          onClick={() => set(dark)}
          className={
            isDark === dark
              ? 'rounded-lg bg-surface px-4 py-1.5 text-sm font-bold text-ink shadow-sm'
              : 'rounded-lg px-4 py-1.5 text-sm font-semibold text-ink-muted'
          }
        >
          {dark ? '🌙 Dark' : '☀️ Light'}
        </button>
      ))}
    </div>
  );
}

/** กรอบพื้นหลังตามธีม (หน้า docs ของ Storybook เป็นพื้นขาวเสมอ) */
export function TokenCanvas({ children }: { children: React.ReactNode }) {
  return <div className="sb-unstyled not-prose rounded-2xl border border-border bg-canvas p-6 text-ink">{children}</div>;
}

function Swatch({ token, label }: { token: string; label?: string }) {
  const value = useCssVar(`--tb-${token}`);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-16 rounded-xl border border-border shadow-sm" style={{ background: `var(--tb-${token})` }} />
      <div className="text-xs leading-tight">
        <div className="font-bold text-ink">{label ?? token}</div>
        <code className="text-ink-muted">--tb-{token}</code>
        <div className="font-mono text-ink-subtle uppercase">{value}</div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="not-prose my-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{children}</div>;
}

export function SurfaceSwatches() {
  return (
    <Grid>
      {['canvas', 'surface', 'surface-muted', 'surface-sunken', 'border', 'border-strong', 'dot'].map((token) => (
        <Swatch key={token} token={token} />
      ))}
    </Grid>
  );
}

export function TextSwatches() {
  return (
    <Grid>
      {['ink', 'ink-muted', 'ink-subtle', 'ink-inverse', 'link', 'focus'].map((token) => (
        <Swatch key={token} token={token} />
      ))}
    </Grid>
  );
}

export function BrandSwatches() {
  return (
    <Grid>
      {['brand', 'brand-hover', 'brand-soft', 'brand-ink'].map((token) => (
        <Swatch key={token} token={token} />
      ))}
    </Grid>
  );
}

export function FeedbackSwatches() {
  return (
    <Grid>
      {['success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft', 'info', 'info-soft'].map((token) => (
        <Swatch key={token} token={token} />
      ))}
    </Grid>
  );
}

const stickyNames = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange', 'teal', 'gray'] as const;

function StickySwatch({ name }: { name: (typeof stickyNames)[number] }) {
  const bg = useCssVar(`--tb-sticky-${name}`);
  const ink = useCssVar(`--tb-sticky-${name}-ink`);
  return (
    <div
      className="flex h-28 flex-col justify-between rounded-lg p-3 shadow-md"
      style={{ background: `var(--tb-sticky-${name})`, color: `var(--tb-sticky-${name}-ink)` }}
    >
      <span className="text-sm font-extrabold capitalize">{name}</span>
      <span className="font-mono text-[11px] leading-tight uppercase">
        bg {bg}
        <br />
        ink {ink}
      </span>
    </div>
  );
}

export function StickySwatches() {
  return (
    <div className="not-prose my-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stickyNames.map((name) => (
        <StickySwatch key={name} name={name} />
      ))}
    </div>
  );
}

const typeScale = [
  { cls: 'text-3xl font-extrabold', name: '3xl / 36px · 800', sample: 'Tracking Board' },
  { cls: 'text-2xl font-extrabold', name: '2xl / 28px · 800', sample: 'หัวข้อหน้า Page title' },
  { cls: 'text-xl font-extrabold', name: 'xl / 22px · 800', sample: 'ทำหน้า Kanban board' },
  { cls: 'text-lg font-bold', name: 'lg / 18px · 700', sample: 'Section heading หัวข้อย่อย' },
  { cls: 'text-base', name: 'base / 16px · 400', sample: 'เนื้อหา Docs ปกติ Body text for pages.' },
  { cls: 'text-sm font-semibold', name: 'sm / 14px · 600', sample: 'ชื่อการ์ด, ปุ่ม, label' },
  { cls: 'text-xs font-bold', name: 'xs / 12px · 700', sample: 'TB-12 · metadata · badge' },
];

export function TypeScale() {
  return (
    <div className="not-prose my-4 flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {typeScale.map((row) => (
        <div key={row.name} className="flex items-baseline gap-6 px-4 py-3">
          <code className="w-40 shrink-0 text-xs text-ink-subtle">{row.name}</code>
          <span className={`${row.cls} text-ink`}>{row.sample}</span>
        </div>
      ))}
    </div>
  );
}

export function RadiusAndShadow() {
  return (
    <div className="not-prose my-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
      {[
        ['rounded-md', '8px · input, ปุ่มเล็ก', 'shadow-sm'],
        ['rounded-lg', '12px · การ์ด, ปุ่ม', 'shadow-md'],
        ['rounded-xl', '16px · panel, column', 'shadow-lg'],
        ['rounded-2xl', '20px · modal, page', 'shadow-lift'],
      ].map(([radius, label, shadow]) => (
        <div key={radius} className="flex flex-col gap-2">
          <div className={`h-20 border border-border bg-surface ${radius} ${shadow}`} />
          <code className="text-xs text-ink">
            {radius} + {shadow}
          </code>
          <span className="text-xs text-ink-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function IssueMapping() {
  return (
    <div className="not-prose my-4 grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-bold text-ink">Type</p>
        <ul className="flex flex-col gap-2">
          {ISSUE_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-2 text-sm">
              <IssueTypeIcon type={type} showLabel />
              <span className="text-ink-muted">— {issueTypeMeta[type].labelTh}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-bold text-ink">Status</p>
        <ul className="flex flex-col gap-2">
          {ISSUE_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-2 text-sm">
              <StatusPill status={status} size="sm" />
              <span className="text-ink-muted">— {issueStatusMeta[status].labelTh}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-bold text-ink">Priority</p>
        <ul className="flex flex-col gap-2">
          {[...ISSUE_PRIORITIES].reverse().map((priority) => (
            <li key={priority} className="flex items-center gap-2 text-sm">
              <PriorityIcon priority={priority} showLabel />
              <span className="text-ink-muted">— {issuePriorityMeta[priority].labelTh}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

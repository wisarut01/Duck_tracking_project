import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, FileText, Loader, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { IssueSummary, PageSummary, SearchResult } from '@/types/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { StatusPill } from '@/components/issues/StatusPill';
import { Highlight } from './Highlight';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** ผลจาก GET /search?q= (null = ยังไม่ได้ค้น) */
  results: SearchResult | null;
  loading?: boolean;
  onSelectIssue?: (issue: IssueSummary) => void;
  onSelectPage?: (page: PageSummary) => void;
}

/** หนึ่งรายการในผลค้นหา — ใช้ "discriminated union" (kind) แยก issue กับ page */
type ResultItem = { kind: 'issue'; issue: IssueSummary } | { kind: 'page'; page: PageSummary };

/**
 * Command palette (⌘K) — ค้นหารวม issue + page, จัดกลุ่มผลลัพธ์
 * คีย์บอร์ด: ↑/↓ เลือก, Enter เปิด, Esc ปิด
 * a11y: input เป็น combobox, รายการเป็น listbox, ตัวที่เลือกบอกผ่าน aria-activedescendant
 */
export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  loading = false,
  onSelectIssue,
  onSelectPage,
}: CommandPaletteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const items: ResultItem[] = [
    ...(results?.issues ?? []).map((issue): ResultItem => ({ kind: 'issue', issue })),
    ...(results?.pages ?? []).map((page): ResultItem => ({ kind: 'page', page })),
  ];
  const issueCount = results?.issues.length ?? 0;
  // ถ้าผลลัพธ์น้อยลง index เดิมอาจเกิน → บีบให้อยู่ในช่วง
  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function choose(item: ResultItem | undefined) {
    if (!item) return;
    if (item.kind === 'issue') onSelectIssue?.(item.issue);
    else onSelectPage?.(item.page);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((safeIndex + 1) % Math.max(items.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((safeIndex - 1 + items.length) % Math.max(items.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(items[safeIndex]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  function renderItem(item: ResultItem, index: number) {
    const active = index === safeIndex;
    return (
      <div
        key={item.kind === 'issue' ? item.issue.id : item.page.id}
        id={optionId(index)}
        role="option"
        aria-selected={active}
        onMouseEnter={() => setActiveIndex(index)}
        onMouseDown={(event) => event.preventDefault()} // กัน input เสีย focus
        onClick={() => choose(item)}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
          active ? 'bg-brand-soft text-ink' : 'text-ink-muted',
        )}
      >
        {item.kind === 'issue' ? (
          <>
            <IssueTypeIcon type={item.issue.type} size="sm" />
            <span className="w-14 shrink-0 font-mono text-xs font-bold text-ink-muted">
              <Highlight text={item.issue.key} query={query} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">
              <Highlight text={item.issue.title} query={query} />
            </span>
            <StatusPill status={item.issue.status} size="sm" />
          </>
        ) : (
          <>
            <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-sticky-yellow text-sticky-yellow-ink">
              <FileText size={12} strokeWidth={2.5} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">
              <Highlight text={item.page.title} query={query} />
            </span>
            <span className="text-xs font-bold text-ink-subtle">{item.page.spaceKey}</span>
          </>
        )}
        {active && <CornerDownLeft size={14} className="text-ink-subtle" aria-hidden />}
      </div>
    );
  }

  const hasQuery = query.trim().length > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหา"
        className="animate-pop-in relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          {loading ? (
            <Loader size={18} className="animate-spin text-ink-subtle" aria-hidden />
          ) : (
            <Search size={18} className="text-ink-subtle" aria-hidden />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-activedescendant={items.length > 0 ? optionId(safeIndex) : undefined}
            aria-autocomplete="list"
            aria-label="ค้นหา issue หรือหน้า Docs"
            placeholder="ค้นหา issue, TB-12, หรือหน้า Docs…"
            className="h-14 flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <kbd className="rounded-md border border-border-strong px-1.5 py-0.5 text-[11px] font-bold text-ink-muted">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasQuery ? (
            <p className="px-3 py-6 text-center text-sm text-ink-subtle">พิมพ์เพื่อค้นหา — ลอง “board” หรือ “TB-12”</p>
          ) : items.length === 0 && !loading ? (
            <EmptyState compact icon={Search} title={`ไม่พบ “${query}”`} description="ลองคำอื่น หรือค้นด้วย issue key" />
          ) : (
            <div id={listId} role="listbox" aria-label="ผลการค้นหา" className="flex flex-col gap-2">
              {issueCount > 0 && (
                <ResultGroup label={`Issues · ${issueCount}`}>
                  {items.slice(0, issueCount).map((item, index) => renderItem(item, index))}
                </ResultGroup>
              )}
              {items.length > issueCount && (
                <ResultGroup label={`Pages · ${items.length - issueCount}`}>
                  {items.slice(issueCount).map((item, index) => renderItem(item, issueCount + index))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>

        <footer className="flex gap-4 border-t border-border bg-surface-muted px-4 py-2 text-[11px] font-semibold text-ink-subtle">
          <span>↑↓ เลือก</span>
          <span>↵ เปิด</span>
          <span>Esc ปิด</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** กลุ่มผลลัพธ์ (Issues / Pages) — role="group" ทำให้ screen reader รู้ว่าอยู่กลุ่มไหน */
function ResultGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-0.5">
      <div aria-hidden className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wide text-ink-subtle uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

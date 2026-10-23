import { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { useAppData } from '@/lib/appData';
import { errorMessage } from '@/api/client';
import type { IssueSummary, PageSummary } from '@/types/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { StatusPill } from '@/components/issues/StatusPill';

type PickerProps<T> = {
  open: boolean;
  onClose: () => void;
  /** id (page) หรือ key (issue) ที่ลิงก์อยู่แล้ว — ไม่แสดงในรายการ */
  excludeIds: string[];
  /** ลิงก์ — throw เมื่อไม่สำเร็จ แล้ว modal จะโชว์ข้อความ error */
  onSelect: (item: T) => Promise<unknown> | void;
};

export type LinkPickerModalProps =
  | ({ kind: 'page' } & PickerProps<PageSummary>)
  | ({ kind: 'issue' } & PickerProps<IssueSummary>);

/**
 * เลือกหน้า Docs (จากหน้า issue) หรือ issue (จากหน้า Docs) มาลิงก์กัน
 * ค้นผ่าน useSearch ของ AppData → แอปจริงเรียก GET /search, Storybook ใช้ fixtures
 */
export function LinkPickerModal(props: LinkPickerModalProps) {
  const { open, onClose, kind, excludeIds } = props;
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const { results, loading } = useAppData().useSearch(open ? query : '');

  async function pick(id: string, select: () => Promise<unknown> | void) {
    setBusyId(id);
    setError(undefined);
    try {
      await select();
      setQuery('');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(undefined);
    }
  }

  const rowClass =
    'flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:bg-brand-soft disabled:opacity-60';

  let list;
  if (!query.trim()) {
    list = <EmptyState compact icon={Search} title={kind === 'page' ? 'พิมพ์ชื่อหน้า Docs' : 'พิมพ์ key หรือชื่อ issue'} />;
  } else if (loading && !results) {
    list = (
      <div className="flex flex-col gap-2" role="status" aria-label="กำลังค้นหา">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    );
  } else if (props.kind === 'page') {
    const { onSelect } = props;
    const pages = (results?.pages ?? []).filter((page) => !excludeIds.includes(page.id));
    list =
      pages.length === 0 ? (
        <EmptyState compact icon={FileText} title={`ไม่พบหน้า “${query}”`} />
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((page) => (
            <li key={page.id}>
              <button type="button" className={rowClass} disabled={busyId !== undefined} onClick={() => pick(page.id, () => onSelect(page))}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sticky-yellow text-sticky-yellow-ink">
                  <FileText size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{page.title}</span>
                <span className="text-xs text-ink-subtle">{page.spaceKey}</span>
              </button>
            </li>
          ))}
        </ul>
      );
  } else {
    const { onSelect } = props;
    const issues = (results?.issues ?? []).filter((issue) => !excludeIds.includes(issue.key));
    list =
      issues.length === 0 ? (
        <EmptyState compact icon={Search} title={`ไม่พบ issue “${query}”`} />
      ) : (
        <ul className="flex flex-col gap-2">
          {issues.map((issue) => (
            <li key={issue.key}>
              <button type="button" className={rowClass} disabled={busyId !== undefined} onClick={() => pick(issue.key, () => onSelect(issue))}>
                <IssueTypeIcon type={issue.type} size="sm" />
                <span className="font-mono text-xs font-bold text-ink-subtle">{issue.key}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{issue.title}</span>
                <StatusPill status={issue.status} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'page' ? 'ลิงก์หน้า Docs' : 'ลิงก์ issue'}
      description={kind === 'page' ? 'เลือกหน้าที่เกี่ยวกับ issue นี้' : 'เลือก issue ที่เกี่ยวกับหน้านี้'}
    >
      <div className="flex flex-col gap-4 pb-2">
        <Input
          aria-label="ค้นหา"
          autoFocus
          leftIcon={<Search size={16} />}
          placeholder={kind === 'page' ? 'เช่น Board Spec' : 'เช่น TB-12 หรือ Kanban'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {list}
      </div>
    </Modal>
  );
}

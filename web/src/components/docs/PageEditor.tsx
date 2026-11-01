import { useState, type KeyboardEvent } from 'react';
import { Check, Columns2, Eye, History, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { readDraft, removeDraft } from '@/lib/pageDraft';
import type { IssueSummary, Page, UpdatePageRequest } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { MarkdownView } from './MarkdownView';
import { usePageAutosave, type AutosaveStatus } from './usePageAutosave';

export type EditorMode = 'edit' | 'split' | 'preview';

export interface PageEditorProps {
  /** หน้าที่จะแก้ */
  page: Pick<Page, 'id' | 'title' | 'contentMd' | 'updatedAt'>;
  /** บันทึกอัตโนมัติ: ได้เฉพาะ field ที่เปลี่ยน → ส่งไป PATCH /pages/{id} ได้ตรงๆ; throw เมื่อไม่สำเร็จ */
  onSave?: (changes: UpdatePageRequest) => Promise<unknown> | void;
  /** บันทึกไม่สำเร็จหลัง editor ปิดไปแล้ว */
  onBackgroundSaveError?: (error: unknown) => void;
  /** กด "เสร็จสิ้น" และบันทึกครบแล้ว */
  onDone?: () => void;
  defaultMode?: EditorMode;
  resolveIssue?: (issueKey: string) => IssueSummary | undefined;
}

const modes: { value: EditorMode; label: string; icon: typeof Pencil }[] = [
  { value: 'edit', label: 'Edit', icon: Pencil },
  { value: 'split', label: 'Split', icon: Columns2 },
  { value: 'preview', label: 'Preview', icon: Eye },
];

const statusLabels: Record<AutosaveStatus, string> = {
  saved: 'บันทึกอัตโนมัติแล้ว',
  pending: '● รอบันทึกอัตโนมัติ…',
  saving: 'กำลังบันทึก…',
  error: 'บันทึกไม่สำเร็จ กำลังลองใหม่ — ข้อความเก็บไว้ในเครื่องแล้ว',
};

/**
 * ตัวแก้ไขหน้า Docs: ซ้าย = Markdown, ขวา = Preview สด (โหมด split)
 * บันทึกอัตโนมัติ (ดู usePageAutosave) — Ctrl/⌘ + S = บันทึกเดี๋ยวนี้
 */
export function PageEditor({ page, onSave, onBackgroundSaveError, onDone, defaultMode = 'split', resolveIssue }: PageEditorProps) {
  // ฉบับร่างที่ค้างจากครั้งก่อน (อ่านครั้งเดียวตอนเปิด editor)
  const [storedDraft] = useState(() => {
    const draft = readDraft(page.id);
    return draft && (draft.title !== page.title || draft.contentMd !== page.contentMd) ? draft : null;
  });
  // หน้ายังเป็นเวอร์ชันเดียวกับตอนเขียนร่าง → ใช้ต่อได้เลย; มีคนแก้ไปแล้ว → ให้ผู้ใช้เลือก จะได้ไม่ทับของใหม่เงียบๆ
  const resume = storedDraft?.baseUpdatedAt === page.updatedAt;
  const [conflictDraft, setConflictDraft] = useState(resume ? null : storedDraft);

  // "controlled input": ค่าใน state เป็นตัวจริง, input แค่แสดงค่าและแจ้งเมื่อเปลี่ยน
  const [title, setTitle] = useState(resume && storedDraft ? storedDraft.title : page.title);
  const [content, setContent] = useState(resume && storedDraft ? storedDraft.contentMd : page.contentMd);
  const [mode, setMode] = useState<EditorMode>(defaultMode);
  const { status, flush } = usePageAutosave({
    page,
    title,
    content,
    setTitle,
    onSave,
    onBackgroundError: onBackgroundSaveError,
    keepStoredDraft: conflictDraft !== null,
  });
  const titleBlank = !title.trim();

  async function finish() {
    if (await flush()) onDone?.();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); // กันเบราว์เซอร์เปิดหน้าต่าง "Save page"
      void flush();
    }
  }

  function restoreDraft() {
    if (!conflictDraft) return;
    setTitle(conflictDraft.title);
    setContent(conflictDraft.contentMd);
    setConflictDraft(null);
  }

  function discardDraft() {
    removeDraft(page.id);
    setConflictDraft(null);
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-2xl border border-border bg-surface shadow-sm" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <div role="radiogroup" aria-label="โหมดแสดงผล" className="flex rounded-lg bg-surface-muted p-0.5">
          {modes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors',
                mode === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon size={13} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <span className={cn('text-xs', status === 'error' || titleBlank ? 'font-bold text-danger' : 'text-ink-subtle')} aria-live="polite">
          {titleBlank ? 'ใส่ชื่อหน้าก่อน จึงจะบันทึกชื่อได้' : statusLabels[status]}
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" leftIcon={<Check size={14} aria-hidden />} onClick={() => void finish()} disabled={titleBlank} loading={status === 'saving'}>
            เสร็จสิ้น
          </Button>
        </div>
      </div>

      {conflictDraft && (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-border bg-sticky-yellow px-4 py-2.5 text-sm text-sticky-yellow-ink">
          <History size={16} aria-hidden />
          <span className="min-w-0 flex-1">มีฉบับร่างที่ยังไม่ได้บันทึก แต่หน้านี้ถูกแก้ไปแล้วหลังจากนั้น</span>
          <Button variant="secondary" size="sm" onClick={restoreDraft}>
            ใช้ฉบับร่าง
          </Button>
          <Button variant="ghost" size="sm" onClick={discardDraft}>
            ทิ้งฉบับร่าง
          </Button>
        </div>
      )}

      {/* Title */}
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="ชื่อหน้า"
        placeholder="ชื่อหน้า…"
        maxLength={200}
        className="border-b border-dashed border-border bg-transparent px-6 py-4 text-2xl font-extrabold text-ink placeholder:text-ink-subtle focus:outline-none"
      />

      {/* Body */}
      <div className={cn('grid min-h-0 flex-1', mode === 'split' && 'md:grid-cols-2')}>
        {mode !== 'preview' && (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            aria-label="เนื้อหา Markdown"
            placeholder="เขียน Markdown… พิมพ์ TB-12 เพื่อลิงก์ไป issue"
            spellCheck={false}
            className={cn(
              'min-h-80 resize-none bg-surface-muted/60 px-6 py-4 font-mono text-sm leading-relaxed text-ink focus:outline-none',
              mode === 'split' && 'md:border-r md:border-border',
            )}
          />
        )}
        {mode !== 'edit' && (
          <div className="min-h-80 overflow-y-auto px-6 py-4" aria-label="ตัวอย่าง (Preview)">
            {content.trim() ? (
              <MarkdownView content={content} resolveIssue={resolveIssue} />
            ) : (
              <p className="text-sm text-ink-subtle italic">ยังไม่มีเนื้อหา</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

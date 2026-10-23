import { useState, type KeyboardEvent } from 'react';
import { Columns2, Eye, Pencil, Save } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { IssueSummary, Page, UpdatePageRequest } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { MarkdownView } from './MarkdownView';

export type EditorMode = 'edit' | 'split' | 'preview';

export interface PageEditorProps {
  /** หน้าที่จะแก้ — ใช้แค่ title กับ contentMd */
  page: Pick<Page, 'title' | 'contentMd'>;
  /** ได้เฉพาะ field ที่เปลี่ยน → ส่งไป PATCH /pages/{id} ได้ตรงๆ */
  onSave?: (changes: UpdatePageRequest) => void;
  onCancel?: () => void;
  saving?: boolean;
  defaultMode?: EditorMode;
  resolveIssue?: (issueKey: string) => IssueSummary | undefined;
}

const modes: { value: EditorMode; label: string; icon: typeof Pencil }[] = [
  { value: 'edit', label: 'Edit', icon: Pencil },
  { value: 'split', label: 'Split', icon: Columns2 },
  { value: 'preview', label: 'Preview', icon: Eye },
];

/**
 * ตัวแก้ไขหน้า Docs: ซ้าย = Markdown, ขวา = Preview สด (โหมด split)
 * กด Ctrl/⌘ + S เพื่อบันทึก
 */
export function PageEditor({ page, onSave, onCancel, saving = false, defaultMode = 'split', resolveIssue }: PageEditorProps) {
  // "controlled input": ค่าใน state เป็นตัวจริง, input แค่แสดงค่าและแจ้งเมื่อเปลี่ยน
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.contentMd);
  const [mode, setMode] = useState<EditorMode>(defaultMode);

  const changes: UpdatePageRequest = {};
  if (title !== page.title) changes.title = title;
  if (content !== page.contentMd) changes.contentMd = content;
  const isDirty = Object.keys(changes).length > 0;
  const canSave = isDirty && title.trim().length > 0 && !saving;

  function save() {
    if (canSave) onSave?.(changes);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); // กันเบราว์เซอร์เปิดหน้าต่าง "Save page"
      save();
    }
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
        <span className="text-xs text-ink-subtle" aria-live="polite">
          {saving ? 'กำลังบันทึก…' : isDirty ? '● มีการแก้ไขที่ยังไม่บันทึก' : 'บันทึกแล้ว'}
        </span>
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              ยกเลิก
            </Button>
          )}
          <Button size="sm" leftIcon={<Save size={14} aria-hidden />} onClick={save} disabled={!canSave} loading={saving}>
            บันทึก
          </Button>
        </div>
      </div>

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

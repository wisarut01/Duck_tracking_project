import { useState } from 'react';
import { FileText, Pencil, Plus } from 'lucide-react';
import { useAppData } from '@/lib/appData';
import { formatDate } from '@/lib/format';
import type { IssueSummary, Page, PageTreeNode, Space, UpdatePageRequest } from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { LinkedIssuesPanel } from '@/components/docs/LinkedIssuesPanel';
import { MarkdownView } from '@/components/docs/MarkdownView';
import { PageEditor } from '@/components/docs/PageEditor';
import { PageTree } from '@/components/docs/PageTree';

export interface DocsPageScreenProps {
  space: Space;
  tree: PageTreeNode[];
  /** หน้าที่เปิดอยู่ — undefined = ยังไม่ได้เลือก / space ยังไม่มีหน้า */
  page?: Page;
  loadingPage?: boolean;
  linkedIssues: IssueSummary[];
  loadingLinkedIssues?: boolean;
  /** เปิดหน้าในโหมดแก้ไขตั้งแต่แรก (เช่น หลังสร้างหน้าใหม่) */
  defaultEditing?: boolean;
  onSelectPage?: (pageId: string) => void;
  onCreatePage?: (parentId: string | null) => void;
  /** บันทึกหน้า — throw เมื่อไม่สำเร็จ แล้ว editor จะยังเปิดค้างไว้ */
  onSavePage?: (changes: UpdatePageRequest) => Promise<unknown> | void;
  /** ลิงก์ issue กับหน้านี้ — throw เมื่อไม่สำเร็จ แล้วหน้าเลือก issue จะโชว์ error */
  onLinkIssue?: (issue: IssueSummary) => Promise<unknown> | void;
  onUnlinkIssue?: (issueKey: string) => void;
}

/**
 * หน้า Docs: page tree ซ้าย · เนื้อหากลาง · linked issues ขวา
 * (ตัวที่ดึงข้อมูลคือ src/pages/DocsPage.tsx)
 */
export function DocsPageScreen({
  space,
  tree,
  page,
  loadingPage = false,
  linkedIssues,
  loadingLinkedIssues = false,
  defaultEditing = false,
  onSelectPage,
  onCreatePage,
  onSavePage,
  onLinkIssue,
  onUnlinkIssue,
}: DocsPageScreenProps) {
  const { resolveIssue } = useAppData();
  const [editing, setEditing] = useState(defaultEditing);
  const [saving, setSaving] = useState(false);

  async function handleSave(changes: UpdatePageRequest) {
    setSaving(true);
    try {
      await onSavePage?.(changes);
      setEditing(false);
    } catch {
      // ข้อความ error แจ้งโดยตัวที่เรียก API (toast) — editor เปิดค้างไว้ให้แก้ต่อได้
    } finally {
      setSaving(false);
    }
  }

  let content;
  if (loadingPage) {
    content = (
      <div className="mx-auto flex max-w-3xl flex-col gap-4" role="status" aria-label="กำลังโหลดหน้า">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  } else if (!page) {
    content = (
      <EmptyState
        icon={FileText}
        title={tree.length === 0 ? `ยังไม่มีหน้าใน ${space.name}` : 'เลือกหน้าจากรายการด้านซ้าย'}
        description="เอกสารเขียนด้วย Markdown และพิมพ์ TB-12 เพื่ออ้างถึง issue ได้"
        action={
          onCreatePage && (
            <Button leftIcon={<Plus size={16} aria-hidden />} onClick={() => onCreatePage(null)}>
              สร้างหน้าใหม่
            </Button>
          )
        }
      />
    );
  } else if (editing) {
    content = (
      <PageEditor page={page} resolveIssue={resolveIssue} saving={saving} onCancel={() => setEditing(false)} onSave={handleSave} />
    );
  } else {
    content = (
      <article className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3 border-b border-dashed border-border pb-4">
          <Avatar user={page.author} size="sm" />
          <span className="text-sm text-ink-muted">
            <b className="text-ink">{page.author.displayName}</b> · แก้ไขล่าสุด {formatDate(page.updatedAt)}
          </span>
          <Button variant="secondary" size="sm" className="ml-auto" leftIcon={<Pencil size={14} aria-hidden />} onClick={() => setEditing(true)}>
            แก้ไข
          </Button>
        </div>
        <MarkdownView content={page.contentMd} resolveIssue={resolveIssue} />
      </article>
    );
  }

  return (
    <AppShell sidebar={{ activeSpaceKey: space.key }} breadcrumbs={[{ label: space.name }, ...(page ? [{ label: page.title }] : [])]}>
      <div className="flex min-h-full">
        {/* Page tree */}
        <aside aria-label="Page tree" className="hidden w-64 shrink-0 border-r border-border bg-surface/60 p-3 md:block">
          <PageTree label={space.name} nodes={tree} activeId={page?.id} onSelect={onSelectPage} onCreatePage={onCreatePage} />
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 p-6 lg:p-10">{content}</div>

        {/* Linked issues */}
        {page && (
          <aside aria-label="Linked issues" className="hidden w-80 shrink-0 p-6 pl-0 xl:block">
            <div className="sticky top-6">
              <LinkedIssuesPanel issues={linkedIssues} loading={loadingLinkedIssues} onLink={onLinkIssue} onUnlink={onUnlinkIssue} />
            </div>
          </aside>
        )}
      </div>
    </AppShell>
  );
}

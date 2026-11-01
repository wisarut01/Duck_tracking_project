import { useState } from 'react';
import { ChevronDown, FileText, Pencil, PencilLine, Plus, Trash2 } from 'lucide-react';
import { useAppData } from '@/lib/appData';
import { formatDate } from '@/lib/format';
import { readDraft } from '@/lib/pageDraft';
import type { IssueSummary, Page, PageTreeNode, Space, UpdatePageRequest, UpdateSpaceRequest } from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { RenameModal } from '@/components/ui/RenameModal';
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
  /** autosave ของ editor — throw เมื่อไม่สำเร็จ แล้ว editor จะลองใหม่เอง */
  onSavePage?: (changes: UpdatePageRequest) => Promise<unknown> | void;
  /** autosave ไม่สำเร็จหลัง editor ปิดไปแล้ว */
  onBackgroundSaveError?: (error: unknown) => void;
  /** กด "เสร็จสิ้น" ใน editor */
  onFinishEditing?: () => void;
  /** throw เมื่อไม่สำเร็จ แล้วฟอร์มจะโชว์ข้อความ error */
  onRenamePage?: (pageId: string, title: string) => Promise<unknown> | void;
  onDeletePage?: (pageId: string) => Promise<unknown> | void;
  onUpdateSpace?: (changes: UpdateSpaceRequest) => Promise<unknown> | void;
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
  onBackgroundSaveError,
  onFinishEditing,
  onRenamePage,
  onDeletePage,
  onUpdateSpace,
  onLinkIssue,
  onUnlinkIssue,
}: DocsPageScreenProps) {
  const { resolveIssue } = useAppData();
  const [editing, setEditing] = useState(defaultEditing);
  // มือถือ: page tree ซ่อนไว้ กดปุ่มด้านบนเพื่อเปิด
  const [treeOpen, setTreeOpen] = useState(false);
  // หน้าที่กำลังเปลี่ยนชื่อ / รอยืนยันการลบ, ฟอร์มแก้ไข space
  const [renaming, setRenaming] = useState<Pick<PageTreeNode, 'id' | 'title'>>();
  const [deleting, setDeleting] = useState<Pick<PageTreeNode, 'id' | 'title'>>();
  const [editingSpace, setEditingSpace] = useState(false);

  // มีฉบับร่างค้างอยู่ (บันทึกไม่ทันเมื่อครั้งก่อน) → เปิด editor ให้เลย ผู้ใช้จะได้ไม่เข้าใจว่าข้อความหาย
  // เช็กครั้งเดียวตอนหน้าโหลดเสร็จ — ตั้ง state ระหว่าง render เหมือนใน AppShell
  const [draftChecked, setDraftChecked] = useState(false);
  if (page && !draftChecked) {
    setDraftChecked(true);
    if (readDraft(page.id)) setEditing(true);
  }

  const treeProps = {
    label: space.name,
    nodes: tree,
    activeId: page?.id,
    onCreatePage,
    onRenamePage: onRenamePage && setRenaming,
    onDeletePage: onDeletePage && setDeleting,
    onEditLabel: onUpdateSpace && (() => setEditingSpace(true)),
  };

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
      <PageEditor
        page={page}
        resolveIssue={resolveIssue}
        onSave={onSavePage}
        onBackgroundSaveError={onBackgroundSaveError}
        onDone={() => {
          setEditing(false);
          onFinishEditing?.();
        }}
      />
    );
  } else {
    content = (
      <article className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-dashed border-border pb-4">
          <Avatar user={page.author} size="sm" />
          <span className="min-w-0 flex-1 text-sm text-ink-muted">
            <b className="text-ink">{page.author.displayName}</b> · แก้ไขล่าสุด {formatDate(page.updatedAt)}
          </span>
          <Button variant="secondary" size="sm" leftIcon={<Pencil size={14} aria-hidden />} onClick={() => setEditing(true)}>
            แก้ไข
          </Button>
          {onRenamePage && (
            <Button variant="ghost" size="sm" leftIcon={<PencilLine size={14} aria-hidden />} onClick={() => setRenaming(page)}>
              เปลี่ยนชื่อ
            </Button>
          )}
          {onDeletePage && (
            <Button variant="ghost" size="sm" iconOnly aria-label="ลบหน้านี้" onClick={() => setDeleting(page)}>
              <Trash2 size={14} aria-hidden />
            </Button>
          )}
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
          <PageTree {...treeProps} onSelect={onSelectPage} />
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          {/* มือถือ: ปุ่มเปิด page tree (จอ md ขึ้นไปมี tree อยู่ด้านซ้ายแล้ว) */}
          <div className="mb-4 md:hidden">
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={treeOpen}
              rightIcon={<ChevronDown size={14} aria-hidden className={treeOpen ? 'rotate-180' : undefined} />}
              onClick={() => setTreeOpen((open) => !open)}
            >
              หน้าทั้งหมดใน {space.name}
            </Button>
            {treeOpen && (
              <div className="mt-2 rounded-xl border border-border bg-surface p-2">
                <PageTree
                  {...treeProps}
                  onSelect={(pageId) => {
                    setTreeOpen(false);
                    onSelectPage?.(pageId);
                  }}
                />
              </div>
            )}
          </div>

          {content}

          {/* จอเล็กกว่า xl: linked issues อยู่ใต้เนื้อหา */}
          {page && !editing && (
            <div className="mx-auto mt-10 max-w-3xl xl:hidden">
              <LinkedIssuesPanel issues={linkedIssues} loading={loadingLinkedIssues} onLink={onLinkIssue} onUnlink={onUnlinkIssue} />
            </div>
          )}
        </div>

        {/* จอ xl ขึ้นไป: linked issues อยู่ด้านขวา */}
        {page && (
          <aside aria-label="Linked issues" className="hidden w-80 shrink-0 p-6 pl-0 xl:block">
            <div className="sticky top-6">
              <LinkedIssuesPanel issues={linkedIssues} loading={loadingLinkedIssues} onLink={onLinkIssue} onUnlink={onUnlinkIssue} />
            </div>
          </aside>
        )}
      </div>

      {renaming && (
        <RenameModal
          key={renaming.id}
          open
          onClose={() => setRenaming(undefined)}
          title="เปลี่ยนชื่อหน้า"
          label="ชื่อหน้า"
          initialName={renaming.title}
          maxLength={200}
          onSubmit={({ name }) => onRenamePage?.(renaming.id, name)}
        />
      )}
      {deleting && (
        <ConfirmModal
          open
          onClose={() => setDeleting(undefined)}
          title={`ลบ “${deleting.title}”?`}
          description="หน้าย่อยทั้งหมดและลิงก์กับ issue จะถูกลบด้วย ย้อนกลับไม่ได้"
          confirmLabel="ลบหน้า"
          onConfirm={() => onDeletePage?.(deleting.id)}
        />
      )}
      {editingSpace && (
        <RenameModal
          open
          onClose={() => setEditingSpace(false)}
          title="แก้ไข space"
          label="ชื่อ space"
          initialName={space.name}
          initialDescription={space.description ?? null}
          maxLength={100}
          onSubmit={({ name, description }) => onUpdateSpace?.({ name, description })}
        />
      )}
    </AppShell>
  );
}

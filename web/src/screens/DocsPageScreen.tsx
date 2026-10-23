import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useNavigate } from 'react-router';
import { formatDate } from '@/lib/format';
import type { IssueSummary, Page, PageTreeNode, Space } from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { LinkedIssuesPanel } from '@/components/docs/LinkedIssuesPanel';
import { MarkdownView } from '@/components/docs/MarkdownView';
import { PageEditor } from '@/components/docs/PageEditor';
import { PageTree } from '@/components/docs/PageTree';
import { findIssueByKey, projects, spaces, userDuck } from '@/mocks/fixtures';
import { searchFixtures } from '@/mocks/search';

export interface DocsPageScreenProps {
  space: Space;
  tree: PageTreeNode[];
  page: Page;
  linkedIssues: IssueSummary[];
  /** เปิดหน้าในโหมดแก้ไขตั้งแต่แรก */
  defaultEditing?: boolean;
}

/** หน้า Docs: page tree ซ้าย · เนื้อหากลาง · linked issues ขวา */
export function DocsPageScreen(props: DocsPageScreenProps) {
  return (
    <ToastProvider>
      <DocsPageContent {...props} />
    </ToastProvider>
  );
}

function DocsPageContent({ space, tree, page: initialPage, linkedIssues: initialLinked, defaultEditing = false }: DocsPageScreenProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [page, setPage] = useState(initialPage);
  const [activeId, setActiveId] = useState(initialPage.id);
  const [editing, setEditing] = useState(defaultEditing);
  const [linkedIssues, setLinkedIssues] = useState(initialLinked);

  return (
    <AppShell
      sidebar={{ projects, spaces, activeSpaceKey: space.key, currentUser: userDuck }}
      breadcrumbs={[{ label: space.name }, { label: page.title }]}
      search={searchFixtures}
      onSelectIssue={(issue) => navigate(`/issues/${issue.key}`)}
    >
      <div className="flex min-h-full">
        {/* Page tree */}
        <aside aria-label="Page tree" className="hidden w-64 shrink-0 border-r border-border bg-surface/60 p-3 md:block">
          <PageTree
            label={space.name}
            nodes={tree}
            activeId={activeId}
            onSelect={setActiveId}
            onCreatePage={() => toast({ tone: 'info', title: 'สร้างหน้าใหม่ (POST /spaces/' + space.key + '/pages)' })}
          />
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 p-6 lg:p-10">
          {editing ? (
            <PageEditor
              page={page}
              resolveIssue={findIssueByKey}
              onCancel={() => setEditing(false)}
              onSave={(changes) => {
                setPage((current) => ({ ...current, ...changes, updatedAt: new Date().toISOString() }));
                setEditing(false);
                toast({ tone: 'success', title: 'บันทึกหน้าแล้ว', description: `PATCH /pages/${page.id}` });
              }}
            />
          ) : (
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
              <MarkdownView content={page.contentMd} resolveIssue={findIssueByKey} />
            </article>
          )}
        </div>

        {/* Linked issues */}
        <aside aria-label="Linked issues" className="hidden w-80 shrink-0 p-6 pl-0 xl:block">
          <div className="sticky top-6">
            <LinkedIssuesPanel
              issues={linkedIssues}
              onLink={() => toast({ tone: 'info', title: 'เลือก issue ที่จะลิงก์ (Phase 2)' })}
              onUnlink={(key) => {
                setLinkedIssues((current) => current.filter((issue) => issue.key !== key));
                toast({ tone: 'success', title: `ยกเลิกลิงก์ ${key} แล้ว` });
              }}
            />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

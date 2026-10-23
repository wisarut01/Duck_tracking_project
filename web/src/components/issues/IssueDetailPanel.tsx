import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { FileText, Link2, MessageSquare, Plus, Send, Unlink, X } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { issuePriorityMeta, issueStatusMeta, issueTypeMeta } from '@/lib/issueMeta';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type Comment,
  type Issue,
  type IssuePriority,
  type IssueStatus,
  type IssueSummary,
  type IssueType,
  type PageSummary,
  type UpdateIssueRequest,
  type User,
} from '@/types/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, colorForLabel } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { MarkdownView } from '@/components/docs/MarkdownView';
import { LinkPickerModal } from '@/components/links/LinkPickerModal';
import { IssueTypeIcon } from './IssueTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusPill } from './StatusPill';

export interface IssueDetailPanelProps {
  issue: Issue;
  comments: Comment[];
  /** หน้า Docs ที่ลิงก์ (GET /issues/{key}/links) */
  linkedPages: PageSummary[];
  /** ตัวเลือก assignee (GET /users) */
  users: User[];
  currentUser?: User;
  resolveIssue?: (issueKey: string) => IssueSummary | undefined;
  /** แก้ field → PATCH /issues/{key} (ส่งเฉพาะ field ที่เปลี่ยน) */
  onUpdate?: (changes: UpdateIssueRequest) => void;
  /** เปลี่ยน status → POST /issues/{key}/move */
  onStatusChange?: (status: IssueStatus) => void;
  onAddComment?: (body: string) => void;
  /** ลิงก์หน้า Docs ที่เลือกจากหน้าค้นหา — ไม่ส่งมา = ไม่มีปุ่ม "Link page" */
  onLinkPage?: (page: PageSummary) => Promise<unknown> | void;
  onUnlinkPage?: (pageId: string) => void;
  /** ถ้ามี จะแสดงปุ่ม × (ใช้ตอนเปิดเป็น drawer ข้าง board) */
  onClose?: () => void;
  loadingComments?: boolean;
  /** panel = แคบ (drawer), page = เต็มหน้า 2 คอลัมน์ */
  layout?: 'panel' | 'page';
}

/** สิ่งที่ผู้ใช้ทำได้กับ issue — drawer บน board และหน้า issue เต็มใช้ชุดเดียวกัน */
export type IssueActions = Pick<IssueDetailPanelProps, 'onUpdate' | 'onStatusChange' | 'onAddComment' | 'onLinkPage' | 'onUnlinkPage'>;

/**
 * รายละเอียด issue: หัวเรื่อง, field ต่างๆ, คำอธิบาย (Markdown), หน้า Docs ที่ลิงก์, comment
 * field เก็บใน local state เพื่อให้ลองเปลี่ยนใน Storybook ได้ และแจ้ง parent ผ่าน onUpdate
 */
export function IssueDetailPanel({
  issue,
  comments,
  linkedPages,
  users,
  currentUser,
  resolveIssue,
  onUpdate,
  onStatusChange,
  onAddComment,
  onLinkPage,
  onUnlinkPage,
  onClose,
  loadingComments = false,
  layout = 'page',
}: IssueDetailPanelProps) {
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [type, setType] = useState<IssueType>(issue.type);
  const [priority, setPriority] = useState<IssuePriority>(issue.priority);
  const [assigneeId, setAssigneeId] = useState<string>(issue.assignee?.id ?? '');

  const isPage = layout === 'page';
  const titleId = useId();

  const fields = (
    <dl className="flex flex-col gap-4">
      <FieldRow label="Status">
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => {
            // value จาก <select> เป็น string เสมอ → บอก TS ว่าเป็น IssueStatus (เรารู้เพราะ option มาจาก enum)
            const next = event.target.value as IssueStatus;
            setStatus(next);
            onStatusChange?.(next);
          }}
          options={ISSUE_STATUSES.map((value) => ({ value, label: issueStatusMeta[value].label }))}
        />
        <StatusPill status={status} size="sm" className="mt-1.5" />
      </FieldRow>
      <FieldRow label="Type">
        <Select
          aria-label="Type"
          value={type}
          onChange={(event) => {
            const next = event.target.value as IssueType;
            setType(next);
            onUpdate?.({ type: next });
          }}
          options={ISSUE_TYPES.map((value) => ({ value, label: issueTypeMeta[value].label }))}
        />
      </FieldRow>
      <FieldRow label="Priority">
        <div className="flex items-center gap-2">
          <PriorityIcon priority={priority} />
          <div className="flex-1">
            <Select
              aria-label="Priority"
              value={priority}
              onChange={(event) => {
                const next = event.target.value as IssuePriority;
                setPriority(next);
                onUpdate?.({ priority: next });
              }}
              options={[...ISSUE_PRIORITIES].reverse().map((value) => ({ value, label: issuePriorityMeta[value].label }))}
            />
          </div>
        </div>
      </FieldRow>
      <FieldRow label="Assignee">
        <div className="flex items-center gap-2">
          <Avatar user={users.find((user) => user.id === assigneeId)} size="sm" />
          <div className="flex-1">
            <Select
              aria-label="Assignee"
              value={assigneeId}
              placeholder="— ยังไม่มอบหมาย —"
              onChange={(event) => {
                setAssigneeId(event.target.value);
                onUpdate?.({ assigneeId: event.target.value || null });
              }}
              options={users.map((user) => ({ value: user.id, label: user.displayName }))}
            />
          </div>
        </div>
      </FieldRow>
      <FieldRow label="Reporter">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Avatar user={issue.reporter} size="sm" />
          {issue.reporter.displayName}
        </span>
      </FieldRow>
      <FieldRow label="Labels">
        {issue.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {issue.labels.map((label) => (
              <Badge key={label} color={colorForLabel(label)}>
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-ink-subtle">ไม่มี</span>
        )}
      </FieldRow>
      <div className="flex flex-col gap-1 border-t border-dashed border-border pt-3 text-xs text-ink-subtle">
        <span>สร้างเมื่อ {formatDate(issue.createdAt)}</span>
        <span>อัปเดตล่าสุด {formatDateTime(issue.updatedAt)}</span>
      </div>
    </dl>
  );

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col bg-surface',
        isPage ? 'rounded-2xl border border-border shadow-sm' : 'h-full w-full max-w-xl border-l border-border shadow-lg',
      )}
    >
      {/* Header */}
      <header className="flex items-start gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-sm">
            <IssueTypeIcon type={type} />
            <span className="font-mono font-bold text-ink-muted">{issue.key}</span>
          </div>
          <h1 id={titleId} className="text-xl font-extrabold text-ink">
            {issue.title}
          </h1>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" iconOnly aria-label="ปิด" onClick={onClose}>
            <X size={18} aria-hidden />
          </Button>
        )}
      </header>

      <div className={cn('flex flex-1 flex-col gap-0', isPage && 'lg:flex-row')}>
        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-8 px-6 py-5">
          {!isPage && <div className="rounded-xl bg-surface-muted/60 p-4">{fields}</div>}

          <section aria-label="Description">
            <SectionTitle>Description</SectionTitle>
            {issue.description ? (
              <MarkdownView content={issue.description} resolveIssue={resolveIssue} />
            ) : (
              <p className="text-sm text-ink-subtle italic">ยังไม่มีคำอธิบาย</p>
            )}
          </section>

          <LinkedPagesSection pages={linkedPages} onLink={onLinkPage} onUnlink={onUnlinkPage} />

          <section aria-label="Comments">
            <SectionTitle icon={<MessageSquare size={15} aria-hidden />} count={comments.length}>
              Comments
            </SectionTitle>
            <CommentList comments={comments} loading={loadingComments} resolveIssue={resolveIssue} />
            {onAddComment && <CommentComposer currentUser={currentUser} onSubmit={onAddComment} />}
          </section>
        </div>

        {/* Side column (layout=page) */}
        {isPage && (
          <aside aria-label="Details" className="w-full shrink-0 border-t border-border px-6 py-5 lg:w-72 lg:border-t-0 lg:border-l">
            {fields}
          </aside>
        )}
      </div>
    </article>
  );
}

// ---------- sub components (ใช้ภายในไฟล์ + export ไว้ใช้ที่อื่นได้) ----------

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-bold tracking-wide text-ink-subtle uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SectionTitle({ children, icon, count, action }: { children: ReactNode; icon?: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && <span className="text-ink-subtle">{icon}</span>}
      <h2 className="text-sm font-bold text-ink">{children}</h2>
      {count !== undefined && <span className="rounded-full bg-surface-muted px-2 text-xs font-bold text-ink-muted">{count}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

interface LinkedPagesSectionProps {
  pages: PageSummary[];
  onLink?: (page: PageSummary) => Promise<unknown> | void;
  onUnlink?: (pageId: string) => void;
}

/** หน้า Docs ที่ลิงก์กับ issue — แสดงเป็น "โน้ตกระดาษ" เล็กๆ; ปุ่ม "Link page" เปิดหน้าค้นหาหน้า Docs */
export function LinkedPagesSection({ pages, onLink, onUnlink }: LinkedPagesSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <section aria-label="Linked pages">
      {onLink && (
        <LinkPickerModal
          kind="page"
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          excludeIds={pages.map((page) => page.id)}
          onSelect={onLink}
        />
      )}
      <SectionTitle
        icon={<Link2 size={15} aria-hidden />}
        count={pages.length}
        action={
          onLink && (
            <Button variant="ghost" size="sm" leftIcon={<Plus size={14} aria-hidden />} onClick={() => setPickerOpen(true)}>
              Link page
            </Button>
          )
        }
      >
        Linked pages
      </SectionTitle>
      {pages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-3 text-sm text-ink-subtle">
          ยังไม่มีหน้า Docs ที่ลิงก์ — กด “Link page” หรือพิมพ์ key ของ issue นี้ในหน้า Docs
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {pages.map((page) => (
            <li key={page.id} className="group relative flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sticky-yellow text-sticky-yellow-ink">
                <FileText size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/spaces/${page.spaceKey}/pages/${page.id}`} className="block truncate text-sm font-bold text-ink hover:underline">
                  {page.title}
                </Link>
                <span className="text-xs text-ink-subtle">
                  {page.spaceKey} · แก้ไข {formatDate(page.updatedAt)}
                </span>
              </div>
              {onUnlink && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`ยกเลิกลิงก์ ${page.title}`}
                  onClick={() => onUnlink(page.id)}
                >
                  <Unlink size={14} aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CommentListProps {
  comments: Comment[];
  loading?: boolean;
  resolveIssue?: (issueKey: string) => IssueSummary | undefined;
}

export function CommentList({ comments, loading = false, resolveIssue }: CommentListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="กำลังโหลด comment">
        {[1, 2].map((n) => (
          <div key={n} className="flex gap-3">
            <Skeleton shape="circle" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="w-24" />
              <Skeleton className="w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (comments.length === 0) {
    return <EmptyState compact icon={MessageSquare} title="ยังไม่มี comment" description="เริ่มคุยเรื่องงานนี้ได้เลย" />;
  }
  return (
    <ol className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3">
          <Avatar user={comment.author} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-sm font-bold text-ink">{comment.author.displayName}</span>
              <time dateTime={comment.createdAt} className="text-xs text-ink-subtle">
                {formatDateTime(comment.createdAt)}
              </time>
            </div>
            <div className="rounded-xl rounded-tl-sm bg-surface-muted px-3.5 py-2.5">
              <MarkdownView content={comment.body} compact resolveIssue={resolveIssue} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

interface CommentComposerProps {
  currentUser?: User;
  onSubmit: (body: string) => void;
}

/** กล่องเขียน comment — Ctrl/⌘ + Enter เพื่อส่ง */
export function CommentComposer({ currentUser, onSubmit }: CommentComposerProps) {
  const [body, setBody] = useState('');
  const trimmed = body.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault(); // กันฟอร์ม reload หน้า
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody('');
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex gap-3">
      <Avatar user={currentUser} />
      <div className="flex flex-1 flex-col gap-2">
        <TextArea
          aria-label="เขียน comment"
          placeholder="เขียน comment… (รองรับ Markdown และ TB-12)"
          rows={3}
          maxLength={5000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleSubmit(event);
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-subtle">Ctrl/⌘ + Enter เพื่อส่ง</span>
          <Button type="submit" size="sm" disabled={!trimmed} leftIcon={<Send size={14} aria-hidden />}>
            ส่ง
          </Button>
        </div>
      </div>
    </form>
  );
}

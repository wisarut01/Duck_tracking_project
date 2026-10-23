import { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Link } from 'react-router';
import { useAppData } from '@/lib/appData';
import { formatDate } from '@/lib/format';
import type { SearchResult } from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { IssueMentionChip } from '@/components/issues/IssueMentionChip';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { StatusPill } from '@/components/issues/StatusPill';
import { Highlight } from '@/components/search/Highlight';

export interface SearchResultsScreenProps {
  defaultQuery: string;
  /** แจ้งเมื่อคำค้นเปลี่ยน (หน้าแอปใช้เก็บลง URL ?q=) */
  onQueryChange?: (query: string) => void;
  /** ถ้าส่งมา จะใช้ผลนี้ตายตัว (ไม่ค้นใหม่ตอนพิมพ์) — ไม่ส่ง = ค้นผ่าน AppData */
  results?: SearchResult;
  loading?: boolean;
  /** เปิด command palette ทับไว้ด้วย */
  paletteOpen?: boolean;
}

type Tab = 'all' | 'issues' | 'pages';

/** หน้า /search?q= — ผลลัพธ์เต็มหน้า แบ่งกลุ่ม Issues / Pages */
export function SearchResultsScreen({
  defaultQuery,
  onQueryChange,
  results: fixedResults,
  loading: fixedLoading,
  paletteOpen = false,
}: SearchResultsScreenProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [tab, setTab] = useState<Tab>('all');
  const search = useAppData().useSearch(query);
  const results = fixedResults ?? search.results ?? { issues: [], pages: [] };
  const loading = fixedLoading ?? search.loading;
  const total = results.issues.length + results.pages.length;

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'ทั้งหมด', count: total },
    { value: 'issues', label: 'Issues', count: results.issues.length },
    { value: 'pages', label: 'Pages', count: results.pages.length },
  ];

  return (
    <AppShell
      breadcrumbs={[{ label: 'Search' }]}
      defaultSearchOpen={paletteOpen}
      defaultSearchQuery={defaultQuery}
    >
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-2xl font-extrabold text-ink">ผลการค้นหา</h1>
        <Input
          aria-label="คำค้นหา"
          leftIcon={<Search size={16} />}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onQueryChange?.(event.target.value);
          }}
          placeholder="ค้นหา…"
        />

        <div role="tablist" aria-label="ประเภทผลลัพธ์" className="mt-5 mb-4 flex gap-1 border-b border-border">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => setTab(item.value)}
              className={
                tab === item.value
                  ? '-mb-px border-b-[3px] border-brand px-3 pb-2 text-sm font-bold text-ink'
                  : 'px-3 pb-2 text-sm font-semibold text-ink-muted hover:text-ink'
              }
            >
              {item.label} <span className="text-ink-subtle">{item.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="กำลังค้นหา">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : !query.trim() ? (
          <EmptyState icon={Search} title="พิมพ์คำที่ต้องการค้นหา" description="ค้นได้ทั้ง issue (key หรือ title) และหน้า Docs" />
        ) : total === 0 ? (
          <EmptyState icon={Search} title={`ไม่พบ “${query}”`} description="ลองคำอื่น หรือค้นด้วย issue key เช่น TB-12" />
        ) : (
          <div className="flex flex-col gap-8">
            {tab !== 'pages' && results.issues.length > 0 && (
              <section aria-label="Issues">
                <h2 className="mb-2 text-xs font-bold tracking-wide text-ink-subtle uppercase">Issues · {results.issues.length}</h2>
                <ul className="flex flex-col gap-2">
                  {results.issues.map((issue) => (
                    <li key={issue.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md">
                      <IssueTypeIcon type={issue.type} />
                      <IssueMentionChip issueKey={issue.key} issue={issue} />
                      <Link to={`/issues/${issue.key}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink hover:underline">
                        <Highlight text={issue.title} query={query} />
                      </Link>
                      <PriorityIcon priority={issue.priority} />
                      <StatusPill status={issue.status} size="sm" />
                      <Avatar user={issue.assignee} size="sm" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {tab !== 'issues' && results.pages.length > 0 && (
              <section aria-label="Pages">
                <h2 className="mb-2 text-xs font-bold tracking-wide text-ink-subtle uppercase">Pages · {results.pages.length}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {results.pages.map((page) => (
                    <li key={page.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sticky-yellow text-sticky-yellow-ink">
                        <FileText size={18} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link to={`/spaces/${page.spaceKey}/pages/${page.id}`} className="block truncate text-sm font-bold text-ink hover:underline">
                          <Highlight text={page.title} query={query} />
                        </Link>
                        <span className="text-xs text-ink-subtle">
                          {page.spaceKey} · {formatDate(page.updatedAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

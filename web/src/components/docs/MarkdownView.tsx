import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { remarkIssueMentions } from '@/lib/remarkIssueMentions';
import type { IssueSummary } from '@/types/api';
import { IssueMentionChip } from '@/components/issues/IssueMentionChip';

export interface MarkdownViewProps {
  /** เนื้อหา Markdown (Page.contentMd / Issue.description / Comment.body) */
  content: string;
  /**
   * ฟังก์ชันหา issue จาก key เพื่อแสดงไอคอน/สถานะใน chip
   * (Phase 2: ดึงจาก react-query cache) — ถ้าไม่ส่งมา chip จะแสดงแค่ key
   */
  resolveIssue?: (issueKey: string) => IssueSummary | undefined;
  /** compact = ตัวเล็กลง ใช้ใน comment */
  compact?: boolean;
  className?: string;
}

/**
 * แสดง Markdown (รองรับ GFM: ตาราง, checklist, ~~ขีดฆ่า~~)
 * และแปลงข้อความ `TB-12` เป็น <IssueMentionChip> อัตโนมัติ
 * — สไตล์อยู่ที่ class `.tb-markdown` ใน styles/index.css
 */
export function MarkdownView({ content, resolveIssue, compact = false, className }: MarkdownViewProps) {
  // components = บอก react-markdown ว่า tag ไหนให้ render ด้วย component ของเรา
  const components: Components = {
    a({ href, children, node: _node, ...props }) {
      // ลิงก์ที่ plugin สร้างจาก TB-12 จะมี data-issue-key ติดมา
      const issueKey = (props as Record<string, unknown>)['data-issue-key'];
      if (typeof issueKey === 'string') {
        return <IssueMentionChip issueKey={issueKey} issue={resolveIssue?.(issueKey)} />;
      }
      // ลิงก์ภายในแอป → ใช้ router, ลิงก์ภายนอก → เปิดแท็บใหม่
      if (href?.startsWith('/')) return <Link to={href}>{children}</Link>;
      return (
        <a href={href} target="_blank" rel="noreferrer" {...props}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className={cn('tb-markdown', compact && 'tb-markdown--compact', className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkIssueMentions]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}

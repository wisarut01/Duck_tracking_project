/**
 * Visual mapping ของ issue type / status / priority (ดู DESIGN.md §7)
 * กติกา a11y: ทุกค่าต้องมี "สี + ไอคอน + ข้อความ" — ห้ามใช้สีอย่างเดียว
 *
 * ใช้ `Record<IssueType, ...>` → TypeScript บังคับว่าต้องครบทุกค่าใน enum
 * (ถ้า spec เพิ่ม type ใหม่ ไฟล์นี้จะ error จนกว่าจะเพิ่ม mapping)
 */
import {
  Bookmark,
  Bug,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Circle,
  CircleCheck,
  CircleDashed,
  Equal,
  Eye,
  SquareCheck,
  type LucideIcon,
} from 'lucide-react';
import type { IssuePriority, IssueStatus, IssueType } from '@/types/api';

/** ชื่อสี sticky-note ที่มีใน theme (ดู styles/index.css) */
export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'purple' | 'orange' | 'teal' | 'gray';

/**
 * class สำเร็จรูปต่อสี — ต้องเขียนเต็มๆ แบบนี้ (ห้ามต่อ string เช่น `bg-sticky-${c}`)
 * เพราะ Tailwind สแกนหา class จาก source code ตรงๆ ถ้าต่อ string มันจะหาไม่เจอ
 */
export const stickyClasses: Record<StickyColor, { bg: string; ink: string }> = {
  yellow: { bg: 'bg-sticky-yellow', ink: 'text-sticky-yellow-ink' },
  pink: { bg: 'bg-sticky-pink', ink: 'text-sticky-pink-ink' },
  green: { bg: 'bg-sticky-green', ink: 'text-sticky-green-ink' },
  blue: { bg: 'bg-sticky-blue', ink: 'text-sticky-blue-ink' },
  purple: { bg: 'bg-sticky-purple', ink: 'text-sticky-purple-ink' },
  orange: { bg: 'bg-sticky-orange', ink: 'text-sticky-orange-ink' },
  teal: { bg: 'bg-sticky-teal', ink: 'text-sticky-teal-ink' },
  gray: { bg: 'bg-sticky-gray', ink: 'text-sticky-gray-ink' },
};

interface VisualMeta {
  label: string;
  /** คำอธิบายภาษาไทยสั้นๆ (ใช้ใน tooltip / aria) */
  labelTh: string;
  icon: LucideIcon;
  color: StickyColor;
}

export const issueTypeMeta: Record<IssueType, VisualMeta> = {
  TASK: { label: 'Task', labelTh: 'งาน', icon: SquareCheck, color: 'blue' },
  BUG: { label: 'Bug', labelTh: 'บั๊ก', icon: Bug, color: 'pink' },
  STORY: { label: 'Story', labelTh: 'สตอรี่', icon: Bookmark, color: 'green' },
};

export const issueStatusMeta: Record<IssueStatus, VisualMeta> = {
  TODO: { label: 'To do', labelTh: 'รอทำ', icon: Circle, color: 'gray' },
  IN_PROGRESS: { label: 'In progress', labelTh: 'กำลังทำ', icon: CircleDashed, color: 'blue' },
  IN_REVIEW: { label: 'In review', labelTh: 'รอรีวิว', icon: Eye, color: 'purple' },
  DONE: { label: 'Done', labelTh: 'เสร็จแล้ว', icon: CircleCheck, color: 'green' },
};

export const issuePriorityMeta: Record<IssuePriority, VisualMeta> = {
  LOWEST: { label: 'Lowest', labelTh: 'ต่ำสุด', icon: ChevronsDown, color: 'teal' },
  LOW: { label: 'Low', labelTh: 'ต่ำ', icon: ChevronDown, color: 'blue' },
  MEDIUM: { label: 'Medium', labelTh: 'ปานกลาง', icon: Equal, color: 'yellow' },
  HIGH: { label: 'High', labelTh: 'สูง', icon: ChevronUp, color: 'orange' },
  HIGHEST: { label: 'Highest', labelTh: 'สูงสุด', icon: ChevronsUp, color: 'pink' },
};

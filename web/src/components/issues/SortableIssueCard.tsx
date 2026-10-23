import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IssueCard, type IssueCardData } from './IssueCard';

export interface SortableIssueCardProps {
  issue: IssueCardData;
  onOpen?: (issueKey: string) => void;
}

/**
 * IssueCard ที่ลากได้ — ห่อด้วย useSortable ของ dnd-kit
 * - setNodeRef: บอก dnd-kit ว่า DOM ไหนคือการ์ดนี้
 * - attributes: role/tabIndex/aria สำหรับคีย์บอร์ด (Space = หยิบ/วาง, ลูกศร = ย้าย)
 * - listeners: event ของเมาส์/นิ้ว/คีย์บอร์ดที่เริ่มการลาก
 */
export function SortableIssueCard({ issue, onOpen }: SortableIssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.key, // ใช้ issue key เป็น id ของ draggable
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="cursor-grab touch-manipulation rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:cursor-grabbing"
      aria-label={`${issue.key} ${issue.title}`}
      {...attributes}
      {...listeners}
      aria-roledescription="การ์ดที่ลากได้" // ใส่หลัง attributes เพื่อแทนค่า default ภาษาอังกฤษ
      onKeyDown={(event) => {
        // Enter = เปิดรายละเอียด (Space ถูกใช้หยิบการ์ดโดย dnd-kit)
        if (event.key === 'Enter') onOpen?.(issue.key);
        listeners?.onKeyDown?.(event);
      }}
    >
      <IssueCard issue={issue} isDragging={isDragging} onClick={() => onOpen?.(issue.key)} />
    </div>
  );
}

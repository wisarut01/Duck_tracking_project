import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { issueStatusMeta } from '@/lib/issueMeta';
import { ISSUE_STATUSES, type Issue, type IssueStatus, type MoveIssueRequest } from '@/types/api';
import { BoardColumn } from './BoardColumn';
import { IssueCard } from './IssueCard';

export interface KanbanBoardProps {
  /** issue ทั้งหมดของ project (จาก GET /projects/{key}/issues) */
  issues: Issue[];
  /**
   * เรียกเมื่อวางการ์ดเสร็จ — payload ตรงกับ MoveIssueRequest ใน openapi
   * (Phase 2: ส่งต่อไป POST /issues/{key}/move)
   */
  onMoveIssue?: (issueKey: string, move: MoveIssueRequest) => void;
  onOpenIssue?: (issueKey: string) => void;
  onAddIssue?: (status: IssueStatus) => void;
  loading?: boolean;
}

/** โครงสร้าง state: แต่ละ status เก็บ "รายการ issue key ตามลำดับ" */
type Columns = Record<IssueStatus, string[]>;

/** จัดกลุ่ม issue ตาม status และเรียงตาม position (น้อย = บน) */
function groupByStatus(issues: Issue[]): Columns {
  const columns: Columns = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
  [...issues]
    .sort((a, b) => a.position - b.position)
    .forEach((issue) => columns[issue.status].push(issue.key));
  return columns;
}

/** type guard: เช็กว่า id ที่ได้จาก dnd-kit เป็นชื่อคอลัมน์หรือไม่ */
function isStatus(id: UniqueIdentifier): id is IssueStatus {
  return (ISSUE_STATUSES as readonly UniqueIdentifier[]).includes(id);
}

/** หาว่า id (issue key หรือ status) อยู่คอลัมน์ไหน */
function findColumn(columns: Columns, id: UniqueIdentifier): IssueStatus | undefined {
  if (isStatus(id)) return id;
  return ISSUE_STATUSES.find((status) => columns[status].includes(String(id)));
}

/**
 * Kanban board 4 คอลัมน์ + drag & drop (dnd-kit) — ตอนนี้เก็บลำดับใน local state
 *
 * หมายเหตุ: state เริ่มจาก props `issues` ครั้งแรกเท่านั้น
 * ถ้าต้องการรีเซ็ต board ให้ส่ง `key` ใหม่ เช่น <KanbanBoard key={projectKey} ... />
 */
export function KanbanBoard({ issues, onMoveIssue, onOpenIssue, onAddIssue, loading = false }: KanbanBoardProps) {
  // useState(() => ...) = คำนวณค่าเริ่มต้นครั้งเดียวตอน mount
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(issues));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // เก็บ snapshot ก่อนลาก ไว้ย้อนกลับเมื่อกด Esc และไว้เทียบว่าย้ายจริงไหม
  const [snapshot, setSnapshot] = useState<Columns | null>(null);

  // useMemo = คำนวณใหม่เฉพาะเมื่อ issues เปลี่ยน (Map สำหรับหา issue จาก key เร็วๆ)
  const issueByKey = useMemo(() => new Map(issues.map((issue) => [issue.key, issue])), [issues]);

  const sensors = useSensors(
    // ต้องลากเกิน 5px ก่อนถึงจะนับว่า "ลาก" → คลิกเปิดการ์ดได้ตามปกติ
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // นิ้ว: ต้องกดค้าง 250ms ก่อนถึงจะลาก — ปัดเฉยๆ ยังเลื่อน board ซ้าย-ขวาได้ตามปกติ
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // คีย์บอร์ด: Space หยิบ/วาง, ลูกศรย้าย, Esc ยกเลิก (Enter เก็บไว้เปิดการ์ด)
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveKey(String(event.active.id));
    setSnapshot(columns);
  }

  /** ลากข้ามคอลัมน์: ย้าย key ไปคอลัมน์ใหม่ทันที เพื่อให้การ์ดอื่นขยับหลบให้ดู */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const from = findColumn(columns, active.id);
    const to = findColumn(columns, over.id);
    if (!from || !to || from === to) return;

    setColumns((current) => {
      const fromItems = current[from].filter((key) => key !== active.id);
      const toItems = [...current[to]];
      // ถ้าลากอยู่เหนือการ์ด → แทรกที่ตำแหน่งการ์ดนั้น, ถ้าอยู่เหนือคอลัมน์ว่าง → ต่อท้าย
      const overIndex = toItems.indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;
      toItems.splice(insertAt, 0, String(active.id));
      return { ...current, [from]: fromItems, [to]: toItems };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const key = String(active.id);
    setActiveKey(null);
    if (!over || !snapshot) {
      setSnapshot(null);
      return;
    }

    const column = findColumn(columns, active.id);
    if (!column) {
      setSnapshot(null);
      return;
    }

    // เรียงลำดับใหม่ภายในคอลัมน์เดียวกัน
    let finalItems = columns[column];
    const oldIndex = finalItems.indexOf(key);
    const newIndex = isStatus(over.id) ? finalItems.length - 1 : finalItems.indexOf(String(over.id));
    if (newIndex >= 0 && oldIndex !== newIndex) {
      finalItems = arrayMove(finalItems, oldIndex, newIndex);
      setColumns((current) => ({ ...current, [column]: finalItems }));
    }

    // เทียบกับก่อนลาก: ถ้าคอลัมน์/ลำดับไม่เปลี่ยน ไม่ต้องเรียก API
    const startColumn = findColumn(snapshot, key);
    const startIndex = startColumn ? snapshot[startColumn].indexOf(key) : -1;
    const finalIndex = finalItems.indexOf(key);
    setSnapshot(null);
    if (startColumn === column && startIndex === finalIndex) return;

    // แปลงเป็น MoveIssueRequest: วางหลัง afterKey และก่อน beforeKey
    onMoveIssue?.(key, {
      status: column,
      afterKey: finalItems[finalIndex - 1] ?? null,
      beforeKey: finalItems[finalIndex + 1] ?? null,
    });
  }

  function handleDragCancel() {
    if (snapshot) setColumns(snapshot); // ย้อนกลับที่เดิม
    setActiveKey(null);
    setSnapshot(null);
  }

  /** ข้อความที่ screen reader อ่านระหว่างลาก (ภาษาไทย) */
  const announcements: Announcements = {
    onDragStart: ({ active }) => `หยิบการ์ด ${active.id} แล้ว ใช้ลูกศรเพื่อย้าย กด Space เพื่อวาง หรือ Esc เพื่อยกเลิก`,
    onDragOver: ({ active, over }) => {
      const column = over ? findColumn(columns, over.id) : undefined;
      return column ? `การ์ด ${active.id} อยู่ในคอลัมน์ ${issueStatusMeta[column].label}` : `การ์ด ${active.id} ไม่ได้อยู่เหนือคอลัมน์ใด`;
    },
    onDragEnd: ({ active, over }) => {
      const column = over ? findColumn(columns, over.id) : undefined;
      return column ? `วางการ์ด ${active.id} ในคอลัมน์ ${issueStatusMeta[column].label}` : `ยกเลิกการย้าย ${active.id}`;
    },
    onDragCancel: ({ active }) => `ยกเลิกการย้าย ${active.id} กลับที่เดิม`,
  };

  const activeIssue = activeKey ? issueByKey.get(activeKey) : undefined;

  /** แปลง key → Issue และเปลี่ยน status ให้ตรงกับคอลัมน์ปัจจุบัน */
  function issuesFor(status: IssueStatus) {
    return columns[status]
      .map((key) => issueByKey.get(key))
      .filter((issue): issue is Issue => issue !== undefined)
      .map((issue) => (issue.status === status ? issue : { ...issue, status }));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'กด Space เพื่อหยิบการ์ด ใช้ลูกศรเพื่อย้าย กด Space อีกครั้งเพื่อวาง กด Enter เพื่อเปิดรายละเอียด',
        },
      }}
    >
      <div className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto pb-4 sm:snap-none sm:gap-4">
        {ISSUE_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            issues={issuesFor(status)}
            onOpenIssue={activeKey ? undefined : onOpenIssue}
            onAddIssue={onAddIssue}
            loading={loading}
          />
        ))}
      </div>

      {/* DragOverlay = การ์ด "ลอย" ที่ตามเมาส์ แยกจากการ์ดจริงในรายการ */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' }}>
        {activeIssue ? <IssueCard issue={activeIssue} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

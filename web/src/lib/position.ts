import type { Issue, MoveIssueRequest } from '@/types/api';

const POSITION_GAP = 1024;

/**
 * คำนวณ position ใหม่แบบเดียวกับ server (ใช้ทำ optimistic update ตอนลากการ์ด)
 * วางระหว่าง afterKey กับ beforeKey = ค่ากลาง, ไม่บอกอะไรเลย = ท้ายคอลัมน์
 */
export function computePosition(all: Issue[], issueKey: string, move: MoveIssueRequest): number {
  const after = all.find((issue) => issue.key === move.afterKey);
  const before = all.find((issue) => issue.key === move.beforeKey);
  if (after && before) return (after.position + before.position) / 2;
  if (after) return after.position + POSITION_GAP;
  if (before) return before.position - POSITION_GAP;
  const column = all.filter((issue) => issue.status === move.status && issue.key !== issueKey);
  return Math.max(0, ...column.map((issue) => issue.position)) + POSITION_GAP;
}

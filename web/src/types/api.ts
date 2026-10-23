/**
 * Types ของ API — ดึงมาจาก `openapi.gen.ts` ที่ generate จาก `api/openapi.yaml`
 *
 * กติกา:
 * - ห้ามแก้ `openapi.gen.ts` เอง → แก้ spec แล้วรัน `npm run gen:api`
 * - ไฟล์นี้แค่ตั้งชื่อสั้น ๆ ให้ schema (ชื่อ type = ชื่อ schema ใน openapi.yaml)
 *   และเก็บค่าคงที่ที่ต้องใช้ตอน runtime (เช่น รายการ status ไว้วน loop)
 */
import type { components } from './openapi.gen';

type Schemas = components['schemas'];

/** UUID string เช่น "7f1c2a9e-0000-4000-8000-000000000001" */
export type UUID = string;
/** ISO-8601 UTC เช่น "2026-10-01T09:00:00Z" */
export type DateTimeString = string;

// ---------- Enums ----------

export type IssueType = Schemas['IssueType'];
export type IssueStatus = Schemas['IssueStatus'];
export type IssuePriority = Schemas['IssuePriority'];

// ค่าจริงไว้วน loop (เรียงตามที่ UI แสดง) — `satisfies` + `AssertAll` ด้านล่าง
// ทำให้ tsc ฟ้องถ้า spec เพิ่ม/ลบค่าแล้วลืมแก้ตรงนี้
export const ISSUE_TYPES = ['TASK', 'BUG', 'STORY'] as const satisfies readonly IssueType[];
export const ISSUE_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const satisfies readonly IssueStatus[];
export const ISSUE_PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] as const satisfies readonly IssuePriority[];

type AssertAll<T extends true> = T;
type CoversAll<List extends readonly unknown[], Union> = [Union] extends [List[number]] ? true : false;
export type _EnumsMatchSpec = [
  AssertAll<CoversAll<typeof ISSUE_TYPES, IssueType>>,
  AssertAll<CoversAll<typeof ISSUE_STATUSES, IssueStatus>>,
  AssertAll<CoversAll<typeof ISSUE_PRIORITIES, IssuePriority>>,
];

export type ApiError = Schemas['Error'];
export type ErrorCode = ApiError['error']['code'];

// ---------- Auth / Users ----------

export type RegisterRequest = Schemas['RegisterRequest'];
export type LoginRequest = Schemas['LoginRequest'];
export type User = Schemas['User'];
export type AuthResponse = Schemas['AuthResponse'];

// ---------- Projects ----------

export type Project = Schemas['Project'];
export type CreateProjectRequest = Schemas['CreateProjectRequest'];

// ---------- Issues ----------

export type IssueSummary = Schemas['IssueSummary'];
/** Issue = IssueSummary + field เพิ่ม (spec ใช้ allOf → ได้เป็น intersection type) */
export type Issue = Schemas['Issue'];
export type IssueList = Schemas['IssueList'];
export type CreateIssueRequest = Schemas['CreateIssueRequest'];
/** ส่งเฉพาะ field ที่เปลี่ยน (minProperties: 1) */
export type UpdateIssueRequest = Schemas['UpdateIssueRequest'];
export type MoveIssueRequest = Schemas['MoveIssueRequest'];

// ---------- Comments ----------

export type Comment = Schemas['Comment'];
export type CreateCommentRequest = Schemas['CreateCommentRequest'];

// ---------- Links ----------

export type CreateLinkRequest = Schemas['CreateLinkRequest'];

// ---------- Docs: Spaces / Pages ----------

export type Space = Schemas['Space'];
export type CreateSpaceRequest = Schemas['CreateSpaceRequest'];
export type PageSummary = Schemas['PageSummary'];
/** โหนดของ page tree — `children` อ้างถึงตัวเอง */
export type PageTreeNode = Schemas['PageTreeNode'];
export type Page = Schemas['Page'];
export type CreatePageRequest = Schemas['CreatePageRequest'];
export type UpdatePageRequest = Schemas['UpdatePageRequest'];

// ---------- Search ----------

export type SearchResult = Schemas['SearchResult'];

import { createContext, useContext, type ReactNode } from 'react';
import type { CreateProjectRequest, CreateSpaceRequest, IssueSummary, Project, SearchResult, Space, User } from '@/types/api';

/**
 * ข้อมูลที่ทุกหน้าใช้ร่วมกัน: เมนูซ้าย, ผู้ใช้, รายชื่อคน, การค้นหา, การแปลง TB-12 เป็นข้อมูล issue
 *
 * component ไม่รู้ว่าข้อมูลมาจากไหน:
 * - ในแอปจริง → ApiAppDataProvider (src/pages/ApiAppDataProvider.tsx) ดึงจาก API ด้วย react-query
 * - ใน Storybook → FixtureAppDataProvider (src/mocks/FixtureAppDataProvider.tsx) ใช้ fixtures
 */
export interface AppData {
  projects: Project[];
  spaces: Space[];
  currentUser?: User;
  /** รายชื่อคนทั้งหมด (ใช้เลือก assignee และกรอง board) */
  users: User[];
  /** หา issue จาก key เช่น "TB-12" — ไม่เจอ = undefined (chip จะโชว์แค่ key) */
  resolveIssue: (issueKey: string) => IssueSummary | undefined;
  /** hook ค้นหา — ถูกเรียกทุก render เหมือน hook ปกติ */
  useSearch: (query: string) => { results: SearchResult | null; loading: boolean };
  onLogout?: () => void;
  /** ปุ่ม + ใน sidebar — ไม่ส่งมา = ไม่มีปุ่ม; throw เมื่อไม่สำเร็จ แล้วฟอร์มจะโชว์ error */
  onCreateProject?: (request: CreateProjectRequest) => Promise<unknown>;
  onCreateSpace?: (request: CreateSpaceRequest) => Promise<unknown>;
}

const empty: AppData = {
  projects: [],
  spaces: [],
  users: [],
  resolveIssue: () => undefined,
  useSearch: () => ({ results: null, loading: false }),
};

const AppDataContext = createContext<AppData>(empty);

export function AppDataProvider({ value, children }: { value: AppData; children: ReactNode }) {
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}

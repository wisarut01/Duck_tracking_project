import type { ReactNode } from 'react';
import { AppDataProvider, type AppData } from '@/lib/appData';
import { findIssueByKey, projects, spaces, userDuck, users } from './fixtures';
import { searchFixtures } from './search';

/** AppData จาก fixtures — Storybook ครอบทุก story ด้วยตัวนี้ (.storybook/preview.tsx) */
const fixtureAppData: AppData = {
  projects,
  spaces,
  currentUser: userDuck,
  users,
  resolveIssue: findIssueByKey,
  useSearch: (query) => ({ results: query.trim() ? searchFixtures(query) : null, loading: false }),
};

export function FixtureAppDataProvider({ children }: { children: ReactNode }) {
  return <AppDataProvider value={fixtureAppData}>{children}</AppDataProvider>;
}

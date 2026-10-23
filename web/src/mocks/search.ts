import type { SearchResult } from '@/types/api';
import { issues, pageTree, spaceENG, toSummary } from './fixtures';
import type { PageTreeNode } from '@/types/api';

/** แปลง page tree ให้เป็น list แบน (ไว้ค้นหา) */
function flatten(nodes: PageTreeNode[]): PageTreeNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

/** จำลอง GET /search?q= ด้วย fixtures (ค้นใน key + title แบบไม่สนตัวพิมพ์) */
export function searchFixtures(query: string): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { issues: [], pages: [] };
  return {
    issues: issues
      .filter((issue) => issue.key.toLowerCase().includes(q) || issue.title.toLowerCase().includes(q))
      .map(toSummary),
    pages: flatten(pageTree)
      .filter((page) => page.title.toLowerCase().includes(q))
      .map((page) => ({ id: page.id, spaceKey: spaceENG.key, title: page.title, updatedAt: '2026-10-04T12:00:00Z' })),
  };
}

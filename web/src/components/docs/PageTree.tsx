import { useState } from 'react';
import { ChevronRight, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PageTreeNode } from '@/types/api';

export interface PageTreeProps {
  /** จาก GET /spaces/{key}/pages */
  nodes: PageTreeNode[];
  /** id ของหน้าที่เปิดอยู่ */
  activeId?: string;
  onSelect?: (pageId: string) => void;
  /** ปุ่ม + เพื่อสร้างหน้าย่อย (parentId = null คือหน้าบนสุด) */
  onCreatePage?: (parentId: string | null) => void;
  /** ปุ่มเปลี่ยนชื่อ / ลบ ในแต่ละแถว — ไม่ส่งมา = ไม่มีปุ่ม */
  onRenamePage?: (node: PageTreeNode) => void;
  onDeletePage?: (node: PageTreeNode) => void;
  /** ปุ่มแก้ไขข้าง label (ชื่อ space) */
  onEditLabel?: () => void;
  /** id ที่ให้ขยายไว้ตั้งแต่แรก — ถ้าไม่ส่ง จะขยาย "เส้นทาง" ไปหาหน้า active อัตโนมัติ */
  defaultExpandedIds?: string[];
  label?: string;
}

/** หา id ของ node บรรพบุรุษทั้งหมดของ targetId (ไว้ขยายให้เห็นหน้า active) */
export function findAncestorIds(nodes: PageTreeNode[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path;
    const found = findAncestorIds(node.children, targetId, [...path, node.id]);
    if (found) return found;
  }
  return null;
}

/**
 * ต้นไม้หน้า Docs (ซ้อนกันได้ไม่จำกัดชั้น) — ใช้ role="tree" / "treeitem" ตาม WAI-ARIA
 * คลิกลูกศรเพื่อขยาย/ยุบ, คลิกชื่อเพื่อเปิดหน้า
 */
export function PageTree({ nodes, activeId, onSelect, onCreatePage, onRenamePage, onDeletePage, onEditLabel, defaultExpandedIds, label = 'Pages' }: PageTreeProps) {
  // Set<string> = ชุดของ id ที่ขยายอยู่ (เช็ก/เพิ่ม/ลบได้เร็ว)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(defaultExpandedIds ?? (activeId ? findAncestorIds(nodes, activeId) ?? [] : [])),
  );

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current); // สร้าง Set ใหม่เสมอ — React เทียบ reference เพื่อรู้ว่า state เปลี่ยน
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 px-2">
        <span className="min-w-0 flex-1 truncate text-xs font-bold tracking-wide text-ink-subtle uppercase">{label}</span>
        {onEditLabel && (
          <button
            type="button"
            onClick={onEditLabel}
            aria-label={`แก้ไข ${label}`}
            className="rounded-md p-1 text-ink-subtle hover:bg-surface-muted hover:text-ink"
          >
            <Pencil size={14} aria-hidden />
          </button>
        )}
        {onCreatePage && (
          <button
            type="button"
            onClick={() => onCreatePage(null)}
            aria-label="สร้างหน้าใหม่"
            className="rounded-md p-1 text-ink-subtle hover:bg-surface-muted hover:text-ink"
          >
            <Plus size={14} aria-hidden />
          </button>
        )}
      </div>
      <ul role="tree" aria-label={label} className="flex flex-col">
        {nodes.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            activeId={activeId}
            expanded={expanded}
            onToggle={toggle}
            onSelect={onSelect}
            onCreatePage={onCreatePage}
            onRenamePage={onRenamePage}
            onDeletePage={onDeletePage}
          />
        ))}
      </ul>
    </div>
  );
}

interface TreeItemProps {
  node: PageTreeNode;
  depth: number;
  activeId?: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (pageId: string) => void;
  onCreatePage?: (parentId: string | null) => void;
  onRenamePage?: (node: PageTreeNode) => void;
  onDeletePage?: (node: PageTreeNode) => void;
}

/** ปุ่มเล็กท้ายแถว */
const rowActionClass = 'rounded-md p-1 text-ink-subtle hover:bg-surface-sunken hover:text-ink';

/** หนึ่งแถวของต้นไม้ — เรียกตัวเองซ้ำ (recursive) สำหรับ children */
function TreeItem({ node, depth, activeId, expanded, onToggle, onSelect, onCreatePage, onRenamePage, onDeletePage }: TreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isActive = node.id === activeId;

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isActive}
      aria-label={node.title}
    >
      <div
        className={cn(
          'group flex h-8 items-center gap-1 rounded-lg pr-1 text-sm transition-colors',
          isActive ? 'bg-brand-soft font-bold text-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        )}
        // ย่อหน้าตามความลึก — ใช้ style เพราะค่าเปลี่ยนตาม depth (Tailwind class ต้องรู้ค่าตอน build)
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isExpanded ? `ยุบ ${node.title}` : `ขยาย ${node.title}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-surface-sunken"
          >
            <ChevronRight size={14} aria-hidden className={cn('transition-transform', isExpanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
            <FileText size={13} />
          </span>
        )}
        <button
          type="button"
          onClick={() => onSelect?.(node.id)}
          aria-current={isActive ? 'page' : undefined}
          className="min-w-0 flex-1 truncate text-left"
        >
          {node.title}
        </button>
        {/* กว้าง 0 จนกว่าจะชี้หรือ focus — ชื่อหน้าจะได้ใช้พื้นที่เต็มตอนไม่ได้ทำอะไร แต่ยังกด Tab มาถึงได้ */}
        <div className="flex w-0 shrink-0 overflow-hidden group-focus-within:w-auto group-hover:w-auto">
          {onRenamePage && (
            <button type="button" onClick={() => onRenamePage(node)} aria-label={`เปลี่ยนชื่อ ${node.title}`} className={rowActionClass}>
              <Pencil size={13} aria-hidden />
            </button>
          )}
          {onDeletePage && (
            <button type="button" onClick={() => onDeletePage(node)} aria-label={`ลบ ${node.title}`} className={rowActionClass}>
              <Trash2 size={13} aria-hidden />
            </button>
          )}
          {onCreatePage && (
            <button type="button" onClick={() => onCreatePage(node.id)} aria-label={`สร้างหน้าย่อยใน ${node.title}`} className={rowActionClass}>
              <Plus size={13} aria-hidden />
            </button>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <ul role="group" className="flex flex-col">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreatePage={onCreatePage}
              onRenamePage={onRenamePage}
              onDeletePage={onDeletePage}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

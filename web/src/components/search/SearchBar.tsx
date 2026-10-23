import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SearchBarProps {
  /** คลิก/โฟกัสแล้วเปิด CommandPalette */
  onOpen: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * ช่องค้นหาบน TopBar — จริงๆ เป็น "ปุ่ม" ที่หน้าตาเหมือน input
 * กดแล้วเปิด CommandPalette (และกด ⌘K / Ctrl+K ได้จากทุกที่ ดู AppShell)
 */
export function SearchBar({ onOpen, placeholder = 'ค้นหา issue หรือหน้า Docs…', className }: SearchBarProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        'group flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-left text-sm text-ink-subtle',
        'transition-colors hover:border-border-strong hover:bg-surface',
        className,
      )}
    >
      <Search size={16} aria-hidden className="shrink-0" />
      <span className="flex-1 truncate">{placeholder}</span>
      <kbd className="hidden rounded-md border border-border-strong bg-surface px-1.5 py-0.5 font-sans text-[11px] font-bold text-ink-muted sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

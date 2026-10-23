import { clsx, type ClassValue } from 'clsx';

/**
 * รวม className หลายตัวเข้าด้วยกัน และตัดค่าที่เป็น false/undefined ทิ้ง
 * ตัวอย่าง: cn('px-2', isActive && 'bg-brand', className)
 */
export function cn(...classes: ClassValue[]): string {
  return clsx(classes);
}

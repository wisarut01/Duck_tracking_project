/** แปลง ISO date → ข้อความสั้นๆ เช่น "4 ต.ค. 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** แปลง ISO date → "4 ต.ค. 2026 15:30" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** เอาตัวอักษรแรกของชื่อ (สูงสุด 2 ตัว) ไว้แสดงใน Avatar เช่น "Ken Tanaka" → "KT" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => Array.from(part)[0] ?? '');
  return letters.join('').toUpperCase() || '?';
}

/**
 * Regex จับ issue key ในข้อความ เช่น "TB-12", "MKT-3"
 * ตรงกับ pattern ใน openapi.yaml: ^[A-Z][A-Z0-9]{1,9}-[0-9]+$
 * \b = ขอบคำ → "XTB-12" หรือ "TB-12abc" จะไม่ถูกจับผิดๆ
 */
export const ISSUE_KEY_PATTERN = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g;

/** ชิ้นส่วนข้อความหลังแยก: เป็นข้อความธรรมดา หรือเป็น issue key */
export type TextPart = { kind: 'text'; value: string } | { kind: 'issue'; key: string };

/** แยก "งานอยู่ที่ TB-12 นะ" → [text "งานอยู่ที่ ", issue "TB-12", text " นะ"] */
export function splitIssueMentions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;
  // matchAll ต้องใช้ regex ที่มี flag g — สร้างใหม่ทุกครั้งเพื่อไม่ให้ lastIndex ค้าง
  for (const match of text.matchAll(new RegExp(ISSUE_KEY_PATTERN))) {
    const start = match.index;
    if (start > lastIndex) parts.push({ kind: 'text', value: text.slice(lastIndex, start) });
    parts.push({ kind: 'issue', key: match[1] ?? match[0] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ kind: 'text', value: text.slice(lastIndex) });
  return parts;
}

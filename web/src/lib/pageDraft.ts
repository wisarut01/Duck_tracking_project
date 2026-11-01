/**
 * ฉบับร่างของหน้า Docs ใน localStorage — กันข้อความหายถ้าบันทึกไม่ทัน
 * (เน็ตหลุด, server ยังไม่ตื่น, token หมดอายุ, ปิด tab กลางคัน)
 */
export interface PageDraft {
  title: string;
  contentMd: string;
  /** updatedAt ของหน้าตอนเริ่มเขียนฉบับร่าง — ไม่ตรงกับตอนนี้ = มีคนแก้หน้านี้ไปแล้ว */
  baseUpdatedAt: string;
}

const draftKey = (pageId: string) => `tb-page-draft:${pageId}`;

// localStorage อาจใช้ไม่ได้หรือเต็ม (เช่น private mode) → ทำงานต่อได้ แค่ไม่มีฉบับร่าง
export function readDraft(pageId: string): PageDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(pageId));
    return raw ? (JSON.parse(raw) as PageDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(pageId: string, draft: PageDraft) {
  try {
    localStorage.setItem(draftKey(pageId), JSON.stringify(draft));
  } catch {
    // ดูหมายเหตุด้านบน
  }
}

export function removeDraft(pageId: string) {
  try {
    localStorage.removeItem(draftKey(pageId));
  } catch {
    // ดูหมายเหตุด้านบน
  }
}

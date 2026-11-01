import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/api/client';
import { removeDraft, writeDraft } from '@/lib/pageDraft';
import type { Page, UpdatePageRequest } from '@/types/api';

export type AutosaveStatus = 'saved' | 'pending' | 'saving' | 'error';

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;

interface PageAutosaveOptions {
  page: Pick<Page, 'id' | 'title' | 'contentMd' | 'updatedAt'>;
  title: string;
  content: string;
  setTitle: (title: string) => void;
  /** ได้เฉพาะ field ที่เปลี่ยน — throw เมื่อไม่สำเร็จ */
  onSave?: (changes: UpdatePageRequest) => Promise<unknown> | void;
  /** บันทึกไม่สำเร็จหลัง editor ปิดไปแล้ว (ไม่มีที่โชว์สถานะ) */
  onBackgroundError?: (error: unknown) => void;
  /** true = ยังมีฉบับร่างเก่าที่รอผู้ใช้เลือก → ห้ามเขียนทับ */
  keepStoredDraft?: boolean;
}

/**
 * บันทึกหน้าอัตโนมัติ:
 * - หยุดพิมพ์ 1 วินาที, สลับ tab, เปลี่ยนหน้า หรือปิด editor → บันทึกทันที
 * - ระหว่างที่ยังไม่ได้บันทึก เก็บฉบับร่างไว้ในเครื่อง; ไม่สำเร็จ → ลองใหม่เรื่อยๆ
 * - ส่งทีละ request เท่านั้น ของที่พิมพ์เพิ่มระหว่างรอจะส่งในรอบถัดไป
 * - ชื่อว่างยังไม่บันทึกชื่อ (spec ไม่รับ) แต่เนื้อหายังบันทึกตามปกติ
 */
export function usePageAutosave({ page, title, content, setTitle, onSave, onBackgroundError, keepStoredDraft = false }: PageAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const saved = useRef({ title: page.title, contentMd: page.contentMd });
  const inFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);
  // ค่าล่าสุดสำหรับ timer และ event ที่ถูกเรียกทีหลัง — effect นี้ต้องอยู่ก่อน effect อื่นในไฟล์
  const latest = useRef({ title, content, onSave, onBackgroundError });
  useEffect(() => {
    latest.current = { title, content, onSave, onBackgroundError };
  });

  const pendingChanges = useCallback((): UpdatePageRequest => {
    const changes: UpdatePageRequest = {};
    if (latest.current.title.trim() && latest.current.title !== saved.current.title) changes.title = latest.current.title;
    if (latest.current.content !== saved.current.contentMd) changes.contentMd = latest.current.content;
    return changes;
  }, []);
  const hasPendingChanges = useCallback(() => Object.keys(pendingChanges()).length > 0, [pendingChanges]);

  const pageId = page.id;
  /** ส่งของที่ยังไม่ได้บันทึก — คืน true ถ้าตอนจบไม่มีอะไรค้าง */
  const flush = useCallback(async (): Promise<boolean> => {
    while (inFlight.current) await inFlight.current;
    const changes = pendingChanges();
    if (Object.keys(changes).length === 0) {
      setStatus('saved');
      return true;
    }
    setStatus('saving');
    const request = (async () => {
      try {
        await latest.current.onSave?.(changes);
        saved.current = { ...saved.current, ...changes };
        return true;
      } catch (error) {
        // หน้าถูกลบไปแล้ว: ลองใหม่กี่ครั้งก็ไม่สำเร็จ และไม่มีที่ให้บันทึกแล้ว
        if (error instanceof ApiRequestError && error.status === 404) {
          saved.current = { title: latest.current.title, contentMd: latest.current.content };
          removeDraft(pageId);
          return true;
        }
        if (!mounted.current) latest.current.onBackgroundError?.(error);
        return false;
      }
    })();
    inFlight.current = request;
    const ok = await request;
    inFlight.current = null;
    if (!ok) {
      setStatus('error');
      return false;
    }
    if (hasPendingChanges()) {
      setStatus('pending');
      return flush(); // พิมพ์เพิ่มระหว่างรอ server
    }
    removeDraft(pageId);
    setStatus('saved');
    return true;
  }, [pageId, pendingChanges, hasPendingChanges]);

  // พิมพ์ → รอหยุดพิมพ์แล้วค่อยบันทึก
  useEffect(() => {
    if (!hasPendingChanges()) {
      setStatus((current) => (current === 'saving' ? current : 'saved'));
      return;
    }
    setStatus('pending');
    const timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, content, flush, hasPendingChanges]);

  // เก็บฉบับร่างทุกครั้งที่มีของยังไม่ได้บันทึก
  useEffect(() => {
    if (keepStoredDraft) return;
    if (title !== saved.current.title || content !== saved.current.contentMd) {
      writeDraft(pageId, { title, contentMd: content, baseUpdatedAt: page.updatedAt });
    } else {
      removeDraft(pageId);
    }
  }, [pageId, title, content, page.updatedAt, keepStoredDraft]);

  // บันทึกไม่สำเร็จ → ลองใหม่ (เช่น server บน Render กำลังตื่น)
  useEffect(() => {
    if (status !== 'error') return;
    const timer = setTimeout(() => void flush(), RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, flush]);

  // สลับ tab / ปิด tab / เปลี่ยนหน้า → บันทึกทันที ไม่ต้องรอ
  useEffect(() => {
    mounted.current = true;
    const saveNow = () => void flush();
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    document.addEventListener('visibilitychange', saveWhenHidden);
    window.addEventListener('pagehide', saveNow);
    return () => {
      document.removeEventListener('visibilitychange', saveWhenHidden);
      window.removeEventListener('pagehide', saveNow);
      mounted.current = false;
      saveNow();
    };
  }, [flush]);

  // ชื่อเปลี่ยนจากที่อื่น (เปลี่ยนชื่อจาก page tree) และช่องชื่อไม่มีของค้าง → ตามค่าใหม่
  // เทียบหลัง trim เพราะ server ตัดช่องว่างท้ายชื่อที่ยังพิมพ์ค้างอยู่
  useEffect(() => {
    if (page.title !== latest.current.title.trim() && latest.current.title === saved.current.title) {
      saved.current = { ...saved.current, title: page.title };
      setTitle(page.title);
    }
  }, [page.title, setTitle]);

  return { status, flush };
}

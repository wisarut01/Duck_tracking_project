import { useState } from 'react';
import { errorMessage } from '@/api/client';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** throw เมื่อไม่สำเร็จ แล้ว modal จะเปิดค้างและโชว์ข้อความ error */
  onConfirm: () => Promise<unknown> | void;
}

/** ถามยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ เช่น ลบ */
export function ConfirmModal({ open, onClose, title, description, confirmLabel, onConfirm }: ConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleConfirm() {
    setSubmitting(true);
    setError(undefined);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="danger" loading={submitting} onClick={() => void handleConfirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}

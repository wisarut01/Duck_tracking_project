import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/api/client';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { TextArea } from './TextArea';

export interface RenameModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** ป้ายของช่องชื่อ เช่น "ชื่อหน้า" */
  label: string;
  initialName: string;
  maxLength: number;
  /** string หรือ null = มีช่องคำอธิบายด้วย (project / space), undefined = ไม่มี (หน้า Docs) */
  initialDescription?: string | null;
  /** ได้ชื่อที่ trim แล้ว — throw เมื่อไม่สำเร็จ แล้วฟอร์มจะโชว์ข้อความ error */
  onSubmit: (values: { name: string; description: string | null }) => Promise<unknown> | void;
}

/** เปลี่ยนชื่อหน้า / space / project */
export function RenameModal({ open, onClose, title, label, initialName, maxLength, initialDescription, onSubmit }: RenameModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const hasDescription = initialDescription !== undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (!name.trim()) return;
    setSubmitting(true);
    setServerError(undefined);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || null });
      onClose();
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const formId = 'rename-form';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            บันทึก
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5 pb-2" noValidate>
        {serverError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {serverError}
          </p>
        )}
        <Input
          label={label}
          required
          autoFocus
          maxLength={maxLength}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={triedSubmit && !name.trim() ? 'กรุณาใส่ชื่อ' : undefined}
        />
        {hasDescription && <TextArea label="คำอธิบาย" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />}
      </form>
    </Modal>
  );
}

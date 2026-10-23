import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/api/client';
import type { CreateProjectRequest, CreateSpaceRequest } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';

/** project และ space ใช้ฟอร์มเดียวกัน: key + ชื่อ + คำอธิบาย */
export interface CreateProjectModalProps {
  kind: 'project' | 'space';
  open: boolean;
  onClose: () => void;
  /** throw เมื่อไม่สำเร็จ (เช่น key ซ้ำ → 409) แล้วฟอร์มจะโชว์ข้อความ error */
  onSubmit: (request: CreateProjectRequest & CreateSpaceRequest) => Promise<unknown> | void;
}

/** ตรงกับ pattern ใน openapi.yaml */
const KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

/** เดา key จากชื่อ: "Tracking Board" → "TB", "Engineering" → "ENGI" (ชื่อภาษาไทยเดาไม่ได้ → ว่าง) */
export function suggestKey(name: string): string {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const key = words.length > 1 ? words.map((word) => word[0]).join('') : (words[0] ?? '').slice(0, 4);
  return KEY_PATTERN.test(key) ? key.slice(0, 10) : '';
}

export function CreateProjectModal({ kind, open, onClose, onSubmit }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  // พิมพ์ key เองแล้ว → เลิกเดาจากชื่อ
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>();

  const label = kind === 'project' ? 'project' : 'space';
  const errors = {
    name: !name.trim() ? `กรุณาใส่ชื่อ ${label}` : undefined,
    key: !KEY_PATTERN.test(key) ? 'ตัวพิมพ์ใหญ่ A–Z หรือตัวเลข 2–10 ตัว ขึ้นต้นด้วยตัวอักษร' : undefined,
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (errors.name || errors.key) return;
    setSubmitting(true);
    setServerError(undefined);
    try {
      await onSubmit({ key, name: name.trim(), description: description.trim() || null });
      onClose();
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const formId = `create-${kind}-form`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'project' ? 'สร้าง project ใหม่' : 'สร้าง space ใหม่'}
      description={
        kind === 'project' ? 'key ใช้ขึ้นต้นเลข issue เช่น TB → TB-1, TB-2' : 'space คือหมวดของเอกสาร เช่น ENG สำหรับทีม dev'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            สร้าง {label}
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
          label={`ชื่อ ${label}`}
          required
          autoFocus
          maxLength={100}
          placeholder={kind === 'project' ? 'เช่น Tracking Board' : 'เช่น Engineering'}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!keyTouched) setKey(suggestKey(event.target.value));
          }}
          error={triedSubmit ? errors.name : undefined}
        />
        <Input
          label="Key"
          required
          maxLength={10}
          placeholder={kind === 'project' ? 'TB' : 'ENG'}
          className="font-mono uppercase"
          value={key}
          onChange={(event) => {
            setKeyTouched(true);
            setKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
          }}
          hint="เปลี่ยนทีหลังไม่ได้"
          error={triedSubmit ? errors.key : undefined}
        />
        <TextArea label="คำอธิบาย" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </form>
    </Modal>
  );
}

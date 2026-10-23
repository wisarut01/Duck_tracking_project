import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { issuePriorityMeta, issueTypeMeta, stickyClasses } from '@/lib/issueMeta';
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  type CreateIssueRequest,
  type IssuePriority,
  type IssueType,
  type User,
} from '@/types/api';
import { Badge, colorForLabel } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';

export interface CreateIssueModalProps {
  open: boolean;
  onClose: () => void;
  /** ได้ CreateIssueRequest พร้อมส่ง POST /projects/{key}/issues */
  onSubmit: (request: CreateIssueRequest) => void;
  projectKey: string;
  users: User[];
  submitting?: boolean;
  /** error จาก server เช่น VALIDATION_FAILED */
  serverError?: string;
  defaultType?: IssueType;
}

/** ฟอร์มสร้าง issue — key (เช่น TB-13) server สร้างให้อัตโนมัติ */
export function CreateIssueModal({
  open,
  onClose,
  onSubmit,
  projectKey,
  users,
  submitting = false,
  serverError,
  defaultType = 'TASK',
}: CreateIssueModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>(defaultType);
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [description, setDescription] = useState('');
  // แสดง error ก็ต่อเมื่อผู้ใช้กด "สร้าง" แล้วครั้งหนึ่ง (ไม่ดุตั้งแต่ยังไม่พิมพ์)
  const [triedSubmit, setTriedSubmit] = useState(false);

  const titleError = !title.trim() ? 'กรุณาใส่ชื่อ issue' : title.length > 200 ? 'ไม่เกิน 200 ตัวอักษร' : undefined;

  function addLabel() {
    const label = labelDraft.trim().toLowerCase();
    if (label && !labels.includes(label)) setLabels([...labels, label]);
    setLabelDraft('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (titleError) return;
    onSubmit({
      title: title.trim(),
      type,
      priority,
      assigneeId: assigneeId || null,
      labels,
      description: description.trim() || null,
    });
  }

  const formId = 'create-issue-form';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`สร้าง issue ใน ${projectKey}`}
      description="กรอกแค่ชื่อกับ type ก็พอ ที่เหลือแก้ทีหลังได้"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          {/* ปุ่มอยู่นอก <form> → ใช้ attribute form={id} ผูกกับฟอร์ม */}
          <Button type="submit" form={formId} loading={submitting}>
            สร้าง issue
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
          label="ชื่อ issue"
          required
          autoFocus
          placeholder="เช่น ทำหน้า Kanban board"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={triedSubmit ? titleError : undefined}
          maxLength={200}
        />

        {/* เลือก type แบบ "การ์ดสี" — เป็น radio group จริงเพื่อให้ใช้คีย์บอร์ดได้ */}
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">
            Type<span className="ml-0.5 text-danger" aria-hidden>*</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {ISSUE_TYPES.map((value) => {
              const meta = issueTypeMeta[value];
              const sticky = stickyClasses[meta.color];
              const Icon = meta.icon;
              const checked = type === value;
              return (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition-all',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                    sticky.bg,
                    sticky.ink,
                    checked ? '-translate-y-0.5 border-current shadow-md' : 'border-transparent opacity-80 hover:opacity-100',
                  )}
                >
                  <input
                    type="radio"
                    name="issue-type"
                    value={value}
                    checked={checked}
                    onChange={() => setType(value)}
                    className="sr-only"
                  />
                  <Icon size={18} strokeWidth={2.5} aria-hidden />
                  <span>{meta.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as IssuePriority)}
            options={[...ISSUE_PRIORITIES].reverse().map((value) => ({ value, label: issuePriorityMeta[value].label }))}
          />
          <Select
            label="Assignee"
            value={assigneeId}
            placeholder="— ยังไม่มอบหมาย —"
            onChange={(event) => setAssigneeId(event.target.value)}
            options={users.map((user) => ({ value: user.id, label: user.displayName }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Input
            label="Labels"
            hint="พิมพ์แล้วกด Enter เพื่อเพิ่ม"
            placeholder="frontend"
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault(); // Enter ในช่องนี้ = เพิ่ม label ไม่ใช่ submit
                addLabel();
              }
            }}
          />
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <Badge key={label} color={colorForLabel(label)} onRemove={() => setLabels(labels.filter((l) => l !== label))}>
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <TextArea
          label="รายละเอียด"
          hint="รองรับ Markdown และพิมพ์ TB-12 เพื่ออ้างถึง issue อื่น"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </form>
    </Modal>
  );
}

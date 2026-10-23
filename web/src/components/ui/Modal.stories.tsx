import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

const meta = {
  title: 'Primitives/Modal',
  component: Modal,
  args: {
    open: true,
    onClose: fn(),
    title: 'ลบ issue TB-12?',
    description: 'การลบไม่สามารถย้อนกลับได้ comment และลิงก์ทั้งหมดจะหายไปด้วย',
  },
  parameters: {
    layout: 'fullscreen',
    // modal ใช้ position: fixed → ในหน้า Docs ให้แต่ละ story อยู่ใน iframe ของตัวเอง
    docs: { story: { inline: false, iframeHeight: 420 } },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirm: Story = {
  args: {
    size: 'sm',
    footer: (
      <>
        <Button variant="secondary">ยกเลิก</Button>
        <Button variant="danger">ลบ</Button>
      </>
    ),
  },
};

export const WithForm: Story = {
  args: {
    title: 'สร้าง Space ใหม่',
    description: undefined,
    children: (
      <div className="flex flex-col gap-4">
        <Input label="Key" placeholder="ENG" required />
        <Input label="ชื่อ" placeholder="Engineering" required />
      </div>
    ),
    footer: (
      <>
        <Button variant="secondary">ยกเลิก</Button>
        <Button>สร้าง</Button>
      </>
    ),
  },
};

/** กดปุ่มเพื่อเปิด — ลอง Tab / Shift+Tab (focus trap) และ Esc */
export const Interactive: Story = {
  args: { open: false },
  render: function InteractiveModal(args) {
    // useState เก็บสถานะ เปิด/ปิด — เรียก setOpen แล้ว React จะ render ใหม่
    const [open, setOpen] = useState(false);
    return (
      <div className="p-6">
        <Button onClick={() => setOpen(true)}>เปิด Modal</Button>
        <Modal
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>ยกเลิก</Button>
              <Button onClick={() => setOpen(false)}>ตกลง</Button>
            </>
          }
        />
      </div>
    );
  },
};

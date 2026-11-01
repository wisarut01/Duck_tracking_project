import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmModal } from './ConfirmModal';

const meta = {
  title: 'UI/ConfirmModal',
  component: ConfirmModal,
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    title: 'ลบ TB-12?',
    description: 'comment และลิงก์ของ issue นี้จะถูกลบด้วย ย้อนกลับไม่ได้',
    confirmLabel: 'ลบ issue',
  },
} satisfies Meta<typeof ConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** กดลบแล้ว server ตอบ error → modal เปิดค้างและโชว์ข้อความ */
export const FailsOnConfirm: Story = {
  args: {
    onConfirm: fn(async () => {
      throw new Error('ติดต่อ API ไม่ได้');
    }),
  },
};

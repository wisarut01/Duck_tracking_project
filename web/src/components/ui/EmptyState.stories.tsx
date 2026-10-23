import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Plus, SearchX } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

const meta = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
  args: {
    title: 'ยังไม่มี issue ในโปรเจกต์นี้',
    description: 'เริ่มจากสร้าง issue แรก แล้วลากไปมาบน board ได้เลย',
    action: <Button leftIcon={<Plus size={16} />}>สร้าง issue</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoSearchResults: Story = {
  args: { icon: SearchX, title: 'ไม่พบผลลัพธ์สำหรับ “sprint”', description: 'ลองคำอื่น หรือค้นด้วย issue key เช่น TB-12', action: undefined },
};
export const NoPages: Story = {
  args: { icon: FileText, title: 'Space นี้ยังไม่มีหน้า', description: undefined, action: <Button variant="secondary">สร้างหน้าแรก</Button> },
};
export const Compact: Story = {
  args: { compact: true, title: 'ว่าง', description: 'ลากการ์ดมาวางที่นี่', action: undefined },
  decorators: [(Story) => <div className="w-64 rounded-xl border border-dashed border-border-strong"><Story /></div>],
};

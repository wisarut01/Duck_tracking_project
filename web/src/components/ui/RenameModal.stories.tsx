import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RenameModal } from './RenameModal';

const meta = {
  title: 'UI/RenameModal',
  component: RenameModal,
  args: { open: true, onClose: fn(), onSubmit: fn(), title: 'เปลี่ยนชื่อหน้า', label: 'ชื่อหน้า', initialName: 'Board Spec', maxLength: 200 },
} satisfies Meta<typeof RenameModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PageTitle: Story = {};
/** project / space มีคำอธิบายด้วย */
export const WithDescription: Story = {
  args: { title: 'แก้ไข space', label: 'ชื่อ space', initialName: 'Engineering', maxLength: 100, initialDescription: 'เอกสารทีม dev' },
};

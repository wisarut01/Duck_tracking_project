import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
import { Input } from './Input';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  args: { label: 'ชื่อ issue', placeholder: 'เช่น ทำหน้า Kanban board' },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const WithHint: Story = { args: { hint: 'ไม่เกิน 200 ตัวอักษร' } };
export const WithError: Story = { args: { error: 'title is required', defaultValue: '' } };
export const WithIcon: Story = { args: { label: undefined, placeholder: 'ค้นหา…', leftIcon: <Search size={16} />, 'aria-label': 'ค้นหา' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'TB-12' } };
export const Password: Story = { args: { label: 'รหัสผ่าน', type: 'password', defaultValue: 'password123' } };

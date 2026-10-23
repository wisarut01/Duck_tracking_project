import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';

// `satisfies Meta<typeof Button>` = ตรวจ type ว่าถูกต้อง แต่ยังเก็บ type ละเอียดไว้ใช้ใน StoryObj
const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'สร้าง issue' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'ยกเลิก' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'ดูทั้งหมด' } };
export const Danger: Story = { args: { variant: 'danger', children: 'ลบ issue', leftIcon: <Trash2 size={16} /> } };
export const WithIcons: Story = {
  args: { leftIcon: <Plus size={16} />, rightIcon: <ArrowRight size={16} />, children: 'Create' },
};
export const Loading: Story = { args: { loading: true, children: 'กำลังบันทึก…' } };
export const Disabled: Story = { args: { disabled: true } };
export const IconOnly: Story = {
  args: { iconOnly: true, variant: 'secondary', 'aria-label': 'เพิ่ม', children: <Plus size={18} /> },
};

/** รวมทุกแบบไว้ดูเทียบกัน */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          <Button size={size}>Primary</Button>
          <Button size={size} variant="secondary">Secondary</Button>
          <Button size={size} variant="ghost">Ghost</Button>
          <Button size={size} variant="danger">Danger</Button>
          <Button size={size} loading>Loading</Button>
          <Button size={size} disabled>Disabled</Button>
        </div>
      ))}
    </div>
  ),
};

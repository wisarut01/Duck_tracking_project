import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from 'lucide-react';
import { fn } from 'storybook/test';
import { Badge, colorForLabel } from './Badge';
import type { StickyColor } from '@/lib/issueMeta';

const colors: StickyColor[] = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange', 'teal', 'gray'];

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  args: { children: 'frontend', color: 'blue' },
  argTypes: { color: { control: 'select', options: colors } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: 'outline', color: 'purple' } };
export const Medium: Story = { args: { size: 'md' } };
export const WithIcon: Story = { args: { icon: <Tag size={12} aria-hidden />, color: 'green' } };
/** Tag ที่ลบได้ (ใช้ในฟอร์ม labels) — `fn()` ทำให้เห็น event ในแท็บ Actions */
export const Removable: Story = { args: { onRemove: fn(), color: 'orange', children: 'backend' } };

export const AllColors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <Badge key={color} color={color}>{color}</Badge>
      ))}
    </div>
  ),
};

export const AutoColorLabels: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['frontend', 'backend', 'design', 'docs', 'qa', 'devops', 'auth', 'search'].map((label) => (
        <Badge key={label} color={colorForLabel(label)}>{label}</Badge>
      ))}
    </div>
  ),
};

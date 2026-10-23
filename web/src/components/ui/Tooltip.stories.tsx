import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  args: {
    content: 'สร้าง issue ใหม่ (C)',
    children: <Button variant="secondary">Hover / Focus ฉัน</Button>,
  },
  decorators: [(Story) => <div className="flex min-h-40 items-center justify-center"><Story /></div>],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AlwaysOpen: Story = { args: { defaultOpen: true } };

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-16 p-8">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} side={side} content={`side = ${side}`} defaultOpen>
          <Button variant="secondary" size="sm">{side}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const OnIconButton: Story = {
  args: {
    content: 'Priority ใช้จัดลำดับความสำคัญ ไม่ใช่ deadline',
    children: (
      <Button variant="ghost" size="sm" iconOnly aria-label="ข้อมูลเพิ่มเติม">
        <Info size={16} aria-hidden />
      </Button>
    ),
  },
};

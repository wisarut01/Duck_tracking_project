import type { Meta, StoryObj } from '@storybook/react-vite';
import { IssueCardSkeleton, Skeleton } from './Skeleton';

const meta = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
  args: { shape: 'text', className: 'w-64' },
  argTypes: { shape: { control: 'inline-radio', options: ['text', 'circle', 'rect'] } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};
export const Circle: Story = { args: { shape: 'circle', className: 'h-10 w-10' } };
export const Rect: Story = { args: { shape: 'rect', className: 'h-32 w-72' } };

export const Paragraph: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-2" role="status" aria-label="กำลังโหลดเนื้อหา">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton />
      <Skeleton />
      <Skeleton className="w-3/4" />
    </div>
  ),
};

export const IssueCards: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3" role="status" aria-label="กำลังโหลด issue">
      <IssueCardSkeleton />
      <IssueCardSkeleton />
      <IssueCardSkeleton />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusPill } from './StatusPill';
import { ISSUE_STATUSES } from '@/types/api';

const meta = {
  title: 'Domain/StatusPill',
  component: StatusPill,
  args: { status: 'IN_PROGRESS' },
  argTypes: {
    status: { control: 'inline-radio', options: ISSUE_STATUSES },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const Todo: Story = { args: { status: 'TODO' } };
export const InReview: Story = { args: { status: 'IN_REVIEW' } };
export const Done: Story = { args: { status: 'DONE' } };
export const Small: Story = { args: { size: 'sm' } };
export const IconOnly: Story = { args: { iconOnly: true } };

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {ISSUE_STATUSES.map((status) => <StatusPill key={status} status={status} />)}
      </div>
      <div className="flex flex-wrap gap-2">
        {ISSUE_STATUSES.map((status) => <StatusPill key={status} status={status} size="sm" />)}
      </div>
      <div className="flex flex-wrap gap-3">
        {ISSUE_STATUSES.map((status) => <StatusPill key={status} status={status} iconOnly />)}
      </div>
    </div>
  ),
};

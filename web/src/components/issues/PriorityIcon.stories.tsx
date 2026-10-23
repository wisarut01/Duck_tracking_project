import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriorityIcon } from './PriorityIcon';
import { ISSUE_PRIORITIES } from '@/types/api';

const meta = {
  title: 'Domain/PriorityIcon',
  component: PriorityIcon,
  args: { priority: 'HIGH' },
  argTypes: { priority: { control: 'select', options: ISSUE_PRIORITIES } },
} satisfies Meta<typeof PriorityIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {};
export const Highest: Story = { args: { priority: 'HIGHEST' } };
export const Lowest: Story = { args: { priority: 'LOWEST' } };
export const WithLabel: Story = { args: { priority: 'MEDIUM', showLabel: true } };

export const AllPriorities: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {[...ISSUE_PRIORITIES].reverse().map((priority) => (
        <PriorityIcon key={priority} priority={priority} showLabel />
      ))}
    </div>
  ),
};

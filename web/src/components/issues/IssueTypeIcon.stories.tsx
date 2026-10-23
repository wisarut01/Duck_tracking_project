import type { Meta, StoryObj } from '@storybook/react-vite';
import { IssueTypeIcon } from './IssueTypeIcon';
import { ISSUE_TYPES } from '@/types/api';

const meta = {
  title: 'Domain/IssueTypeIcon',
  component: IssueTypeIcon,
  args: { type: 'TASK', size: 'md' },
  argTypes: {
    type: { control: 'inline-radio', options: ISSUE_TYPES },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof IssueTypeIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Task: Story = {};
export const Bug: Story = { args: { type: 'BUG' } };
export const StoryType: Story = { name: 'Story', args: { type: 'STORY' } };
export const WithLabel: Story = { args: { type: 'BUG', showLabel: true } };

export const AllTypesAndSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-6">
          {ISSUE_TYPES.map((type) => (
            <IssueTypeIcon key={type} type={type} size={size} showLabel />
          ))}
        </div>
      ))}
    </div>
  ),
};

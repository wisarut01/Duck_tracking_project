import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';

const priorityOptions = [
  { value: 'HIGHEST', label: 'Highest' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'LOWEST', label: 'Lowest' },
];

const meta = {
  title: 'Primitives/Select',
  component: Select,
  args: { label: 'Priority', options: priorityOptions, defaultValue: 'MEDIUM' },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithPlaceholder: Story = {
  args: {
    label: 'Assignee',
    placeholder: '— ยังไม่มอบหมาย —',
    defaultValue: '',
    options: [
      { value: '1', label: 'Duck' },
      { value: '2', label: 'Mint' },
    ],
  },
};
export const WithError: Story = { args: { error: 'กรุณาเลือก', defaultValue: undefined, placeholder: 'เลือก…' } };
export const Disabled: Story = { args: { disabled: true } };

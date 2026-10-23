import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LinkedIssuesPanel } from './LinkedIssuesPanel';
import { linkedIssuesBoardSpec } from '@/mocks/fixtures';

const meta = {
  title: 'Docs/LinkedIssuesPanel',
  component: LinkedIssuesPanel,
  args: { issues: linkedIssuesBoardSpec, onLink: fn(), onUnlink: fn() },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof LinkedIssuesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { issues: [] } };
export const Loading: Story = { args: { loading: true } };
export const ReadOnly: Story = { args: { onLink: undefined, onUnlink: undefined } };

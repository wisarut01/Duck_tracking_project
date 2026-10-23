import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IssueDetailPanel } from './IssueDetailPanel';
import { commentsTB12, findIssueByKey, issueTB12, issues, linkedPagesTB12, userDuck, users } from '@/mocks/fixtures';

const meta = {
  title: 'Domain/IssueDetailPanel',
  component: IssueDetailPanel,
  args: {
    issue: issueTB12,
    comments: commentsTB12,
    linkedPages: linkedPagesTB12,
    users,
    currentUser: userDuck,
    resolveIssue: findIssueByKey,
    onUpdate: fn(),
    onStatusChange: fn(),
    onAddComment: fn(),
    onLinkPage: fn(),
    onUnlinkPage: fn(),
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof IssueDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** เต็มหน้า: เนื้อหาซ้าย + field ขวา */
export const PageLayout: Story = {};

/** Drawer ข้าง board (มีปุ่มปิด) */
export const PanelLayout: Story = {
  args: { layout: 'panel', onClose: fn() },
  decorators: [(Story) => <div className="flex h-[900px] justify-end bg-dot-grid"><Story /></div>],
  parameters: { layout: 'fullscreen' },
};

export const BugNoDescription: Story = {
  args: { issue: issues.find((issue) => issue.key === 'TB-4')!, comments: [], linkedPages: [] },
};

export const LoadingComments: Story = { args: { loadingComments: true } };

export const ReadOnly: Story = {
  args: { onAddComment: undefined, onLinkPage: undefined, onUnlinkPage: undefined },
};

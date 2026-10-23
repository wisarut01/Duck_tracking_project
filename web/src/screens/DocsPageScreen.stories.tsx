import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DocsPageScreen } from './DocsPageScreen';
import { linkedIssuesBoardSpec, pageBoardSpec, pageTree, spaceENG } from '@/mocks/fixtures';

const meta = {
  title: 'Screens/DocsPage',
  component: DocsPageScreen,
  args: {
    space: spaceENG,
    tree: pageTree,
    page: pageBoardSpec,
    linkedIssues: linkedIssuesBoardSpec,
    onSelectPage: fn(),
    onCreatePage: fn(),
    onSavePage: fn(),
    onLinkIssue: fn(),
    onUnlinkIssue: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DocsPageScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** TB-12 / TB-3 ในเนื้อหาแสดงเป็น chip — กด "แก้ไข" เพื่อเปิด editor */
export const Reading: Story = {};
export const Editing: Story = { args: { defaultEditing: true } };
export const NoLinkedIssues: Story = { args: { linkedIssues: [] } };
export const LoadingPage: Story = { args: { page: undefined, loadingPage: true } };
export const EmptySpace: Story = { args: { page: undefined, tree: [] } };

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ProjectBoardScreen, type ProjectBoardScreenProps } from './ProjectBoardScreen';
import { commentsTB12, issues, linkedPagesTB12, projectTB } from '@/mocks/fixtures';

/** ใน Storybook ไม่มี API — เก็บ issue ที่เปิดไว้ใน state ให้คลิกการ์ดแล้ว drawer เปิดได้ */
function BoardWithDrawer(args: ProjectBoardScreenProps) {
  const [openIssueKey, setOpenIssueKey] = useState(args.openIssueKey);
  return (
    <ProjectBoardScreen
      {...args}
      openIssueKey={openIssueKey}
      onOpenIssue={setOpenIssueKey}
      openIssueDetails={
        openIssueKey === 'TB-12' ? { comments: commentsTB12, linkedPages: linkedPagesTB12 } : { comments: [], linkedPages: [] }
      }
    />
  );
}

const meta = {
  title: 'Screens/ProjectBoard',
  component: ProjectBoardScreen,
  render: BoardWithDrawer,
  args: { project: projectTB, issues, onMoveIssue: fn(), onCreateIssue: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProjectBoardScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ลากการ์ด, คลิกการ์ดเพื่อเปิด drawer, กด Create, กรองด้วย avatar/type, ⌘K ค้นหา */
export const Default: Story = {};
export const WithIssueDrawer: Story = { args: { openIssueKey: 'TB-12' } };
export const Loading: Story = { args: { loading: true, issues: [] } };
export const EmptyProject: Story = { args: { issues: [] } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProjectBoardScreen } from './ProjectBoardScreen';
import { issues, projectTB } from '@/mocks/fixtures';

const meta = {
  title: 'Screens/ProjectBoard',
  component: ProjectBoardScreen,
  args: { project: projectTB, issues },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProjectBoardScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ลากการ์ด, คลิกการ์ดเพื่อเปิด drawer, กด Create, กรองด้วย avatar/type, ⌘K ค้นหา */
export const Default: Story = {};
export const WithIssueDrawer: Story = { args: { defaultOpenIssueKey: 'TB-12' } };
export const Loading: Story = { args: { loading: true, issues: [] } };
export const EmptyProject: Story = { args: { issues: [] } };

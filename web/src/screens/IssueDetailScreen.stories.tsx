import type { Meta, StoryObj } from '@storybook/react-vite';
import { IssueDetailScreen } from './IssueDetailScreen';
import { commentsTB12, issues, issueTB12, linkedPagesTB12 } from '@/mocks/fixtures';

const meta = {
  title: 'Screens/IssueDetail',
  component: IssueDetailScreen,
  args: { issue: issueTB12, comments: commentsTB12, linkedPages: linkedPagesTB12 },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof IssueDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ลองพิมพ์ comment แล้วกด ส่ง / เปลี่ยน status / ยกเลิกลิงก์หน้า */
export const Default: Story = {};
export const BugWithoutLinks: Story = { args: { issue: issues.find((issue) => issue.key === 'TB-4')!, comments: [], linkedPages: [] } };
export const LoadingComments: Story = { args: { loadingComments: true } };

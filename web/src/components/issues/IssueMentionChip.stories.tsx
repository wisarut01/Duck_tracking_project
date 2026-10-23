import type { Meta, StoryObj } from '@storybook/react-vite';
import { IssueMentionChip } from './IssueMentionChip';
import { findIssueByKey } from '@/mocks/fixtures';

const meta = {
  title: 'Domain/IssueMentionChip',
  component: IssueMentionChip,
  args: { issueKey: 'TB-12', issue: findIssueByKey('TB-12') },
} satisfies Meta<typeof IssueMentionChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Known: Story = {};
export const Bug: Story = { args: { issueKey: 'TB-4', issue: findIssueByKey('TB-4') } };
/** Done = ขีดฆ่า key (เหมือนติ๊กงานเสร็จบน whiteboard) */
export const Done: Story = { args: { issueKey: 'TB-1', issue: findIssueByKey('TB-1') } };
export const Unknown: Story = { args: { issueKey: 'TB-999', issue: undefined } };
export const WithTitle: Story = { args: { showTitle: true } };

export const InSentence: Story = {
  render: () => (
    <p className="max-w-md text-base text-ink">
      งานหลักอยู่ที่ <IssueMentionChip issueKey="TB-12" issue={findIssueByKey('TB-12')} /> ส่วน API ดูที่{' '}
      <IssueMentionChip issueKey="TB-3" issue={findIssueByKey('TB-3')} /> และของเก่า{' '}
      <IssueMentionChip issueKey="TB-1" issue={findIssueByKey('TB-1')} /> เสร็จไปแล้ว
    </p>
  ),
};

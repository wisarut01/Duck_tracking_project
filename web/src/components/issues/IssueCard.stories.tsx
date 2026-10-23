import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IssueCard } from './IssueCard';
import { issues, issueTB12 } from '@/mocks/fixtures';

const meta = {
  title: 'Domain/IssueCard',
  component: IssueCard,
  args: { issue: issueTB12, onClick: fn() },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
} satisfies Meta<typeof IssueCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StoryCard: Story = { name: 'Story (green)' };
export const BugCard: Story = { name: 'Bug (pink)', args: { issue: issues.find((i) => i.key === 'TB-4')! } };
export const TaskCard: Story = { name: 'Task (blue)', args: { issue: issues.find((i) => i.key === 'TB-8')! } };
export const Unassigned: Story = { args: { issue: { ...issueTB12, assignee: null, labels: [] } } };
export const LongTitle: Story = {
  args: {
    issue: {
      ...issueTB12,
      title: 'ชื่อ issue ที่ยาวมากๆ เพื่อทดสอบว่าการ์ดตัดบรรทัดถูกต้องและแสดงไม่เกินสามบรรทัด แม้ว่าจะมีข้อความภาษาไทยปนกับ English words ก็ตาม',
    },
  },
};
export const Selected: Story = { args: { selected: true } };
export const WithStatus: Story = { args: { showStatus: true } };
/** ตำแหน่งเดิมระหว่างลาก */
export const DraggingPlaceholder: Story = { args: { isDragging: true } };
/** การ์ดที่ลอยตามเมาส์ */
export const DragOverlay: Story = { args: { isOverlay: true } };

export const Wall: Story = {
  decorators: [(Story) => <div className="bg-dot-grid w-[640px] rounded-xl p-6"><Story /></div>],
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {issues.slice(0, 6).map((issue) => <IssueCard key={issue.id} issue={issue} showStatus />)}
    </div>
  ),
};

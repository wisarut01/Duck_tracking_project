import type { Meta, StoryObj } from '@storybook/react-vite';
import { DndContext } from '@dnd-kit/core';
import { fn } from 'storybook/test';
import { BoardColumn } from './BoardColumn';
import { issues } from '@/mocks/fixtures';

const meta = {
  title: 'Domain/BoardColumn',
  component: BoardColumn,
  args: {
    status: 'TODO',
    issues: issues.filter((issue) => issue.status === 'TODO'),
    onOpenIssue: fn(),
    onAddIssue: fn(),
  },
  // BoardColumn ใช้ hook ของ dnd-kit → ต้องมี DndContext ครอบเสมอ
  decorators: [
    (Story) => (
      <DndContext>
        <div className="bg-dot-grid p-6"><Story /></div>
      </DndContext>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BoardColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Todo: Story = {};
export const InReview: Story = { args: { status: 'IN_REVIEW', issues: issues.filter((i) => i.status === 'IN_REVIEW') } };
export const Empty: Story = { args: { status: 'DONE', issues: [] } };
export const Loading: Story = { args: { status: 'IN_PROGRESS', issues: [], loading: true } };
export const WithoutAddButton: Story = { args: { onAddIssue: undefined } };

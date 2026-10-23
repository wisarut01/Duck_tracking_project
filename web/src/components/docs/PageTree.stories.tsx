import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PageTree } from './PageTree';
import { pageBoardSpec, pageTree } from '@/mocks/fixtures';

const meta = {
  title: 'Docs/PageTree',
  component: PageTree,
  args: { nodes: pageTree, activeId: pageBoardSpec.id, onSelect: fn(), onCreatePage: fn(), label: 'Engineering' },
  decorators: [(Story) => <div className="w-64 rounded-xl border border-border bg-surface p-2"><Story /></div>],
} satisfies Meta<typeof PageTree>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ขยายเส้นทางไปหา "Board Spec" อัตโนมัติ */
export const ActivePage: Story = {};
export const Collapsed: Story = { args: { activeId: undefined, defaultExpandedIds: [] } };
export const DeepNested: Story = {
  args: { activeId: '5e6f7081-0000-4000-8000-000000000012' },
};
export const ReadOnly: Story = { args: { onCreatePage: undefined } };
export const Empty: Story = { args: { nodes: [] } };

/** คลิกเพื่อเปลี่ยนหน้า active */
export const Interactive: Story = {
  render: function InteractiveTree(args) {
    const [activeId, setActiveId] = useState(args.activeId);
    return <PageTree {...args} activeId={activeId} onSelect={setActiveId} />;
  },
};

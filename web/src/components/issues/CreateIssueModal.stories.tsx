import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { fn } from 'storybook/test';
import { CreateIssueModal } from './CreateIssueModal';
import { Button } from '@/components/ui/Button';
import { users } from '@/mocks/fixtures';

const meta = {
  title: 'Domain/CreateIssueModal',
  component: CreateIssueModal,
  args: { open: true, onClose: fn(), onSubmit: fn(), projectKey: 'TB', users },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 760 } } },
} satisfies Meta<typeof CreateIssueModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** กด "สร้าง issue" ทั้งที่ยังไม่ใส่ชื่อ เพื่อดู validation */
export const Default: Story = {};
export const BugPreselected: Story = { args: { defaultType: 'BUG' } };
export const Submitting: Story = { args: { submitting: true } };
export const ServerError: Story = { args: { serverError: 'VALIDATION_FAILED: title is required' } };

export const OpenFromButton: Story = {
  args: { open: false },
  render: function OpenFromButtonStory(args) {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-6">
        <Button leftIcon={<Plus size={16} aria-hidden />} onClick={() => setOpen(true)}>
          Create
        </Button>
        <CreateIssueModal
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={(request) => {
            args.onSubmit(request);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

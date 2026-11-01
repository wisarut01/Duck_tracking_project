import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PageEditor } from './PageEditor';
import { findIssueByKey, pageBoardSpec } from '@/mocks/fixtures';

const meta = {
  title: 'Docs/PageEditor',
  component: PageEditor,
  args: { page: pageBoardSpec, onSave: fn(), onDone: fn(), resolveIssue: findIssueByKey },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PageEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** พิมพ์ทางซ้าย เห็นผลทางขวาทันที — ลองพิมพ์ TB-4 */
export const Split: Story = {};
export const EditOnly: Story = { args: { defaultMode: 'edit' } };
export const PreviewOnly: Story = { args: { defaultMode: 'preview' } };
export const NewPage: Story = { args: { page: { ...pageBoardSpec, id: 'story-new-page', title: '', contentMd: '' } } };
/** พิมพ์แล้วรอ 1 วินาที — server ตอบ error ทุกครั้ง จะเห็นสถานะ "บันทึกไม่สำเร็จ" */
export const SaveFails: Story = {
  args: {
    page: { ...pageBoardSpec, id: 'story-save-fails' },
    onSave: fn(async () => {
      throw new Error('ติดต่อ API ไม่ได้');
    }),
  },
};

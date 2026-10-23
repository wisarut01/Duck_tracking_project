import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PageEditor } from './PageEditor';
import { findIssueByKey, pageBoardSpec } from '@/mocks/fixtures';

const meta = {
  title: 'Docs/PageEditor',
  component: PageEditor,
  args: { page: pageBoardSpec, onSave: fn(), onCancel: fn(), resolveIssue: findIssueByKey },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PageEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** พิมพ์ทางซ้าย เห็นผลทางขวาทันที — ลองพิมพ์ TB-4 */
export const Split: Story = {};
export const EditOnly: Story = { args: { defaultMode: 'edit' } };
export const PreviewOnly: Story = { args: { defaultMode: 'preview' } };
export const NewPage: Story = { args: { page: { title: '', contentMd: '' } } };
export const Saving: Story = { args: { saving: true } };

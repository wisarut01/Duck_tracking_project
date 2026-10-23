import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CreateProjectModal } from './CreateProjectModal';

const meta = {
  title: 'Layout/CreateProjectModal',
  component: CreateProjectModal,
  args: { kind: 'project', open: true, onClose: fn(), onSubmit: fn() },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 560 } } },
} satisfies Meta<typeof CreateProjectModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** พิมพ์ชื่อ "Tracking Board" แล้วดู key ถูกเดาเป็น TB; กดสร้างตอนว่างเพื่อดู validation */
export const Project: Story = {};
export const Space: Story = { args: { kind: 'space' } };
/** key ซ้ำ → server ตอบ 409 → ข้อความ error ในฟอร์ม (กรอกให้ครบแล้วกดสร้าง) */
export const DuplicateKey: Story = {
  args: { onSubmit: fn(() => Promise.reject(new Error('project key TB already exists'))) },
};

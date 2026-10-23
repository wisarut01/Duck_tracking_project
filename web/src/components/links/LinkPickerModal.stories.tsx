import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LinkPickerModal } from './LinkPickerModal';
import { linkedPagesTB12 } from '@/mocks/fixtures';

const meta = {
  title: 'Domain/LinkPickerModal',
  component: LinkPickerModal,
  args: { kind: 'page', open: true, onClose: fn(), onSelect: fn(), excludeIds: [] },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 560 } } },
} satisfies Meta<typeof LinkPickerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** พิมพ์ "board" หรือ "spec" เพื่อค้นใน fixtures แล้วคลิกเลือก */
export const PickPage: Story = {};
/** หน้าที่ลิงก์อยู่แล้วไม่แสดงในรายการ */
export const PickPageExcludingLinked: Story = { args: { excludeIds: linkedPagesTB12.map((page) => page.id) } };
/** ใช้จากหน้า Docs — พิมพ์ "TB-1" หรือ "kanban" */
export const PickIssue: Story = { args: { kind: 'issue' } };
/** ลิงก์ไม่สำเร็จ → ข้อความ error ใน modal (ลองคลิกรายการหลังพิมพ์ค้นหา) */
export const LinkFails: Story = {
  args: {
    onSelect: fn(() => Promise.reject(new Error('issue TB-12 is already linked to this page'))),
  },
};

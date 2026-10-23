import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextArea } from './TextArea';

const meta = {
  title: 'Primitives/TextArea',
  component: TextArea,
  args: { label: 'รายละเอียด (Markdown)', placeholder: 'อธิบายงาน…' },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = { args: { hint: 'รองรับ **bold**, `code` และพิมพ์ TB-12 เพื่อลิงก์ issue' } };
export const WithError: Story = { args: { label: 'Comment', error: 'body ต้องไม่ว่าง' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'แก้ไขไม่ได้' } };
export const Tall: Story = { args: { rows: 10, defaultValue: '# หัวข้อ\n\n- รายการ 1\n- รายการ 2' } };

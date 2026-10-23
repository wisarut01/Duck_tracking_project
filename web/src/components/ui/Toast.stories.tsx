import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Toast, ToastProvider, useToast } from './Toast';
import { Button } from './Button';

const meta = {
  title: 'Primitives/Toast',
  component: Toast,
  args: { title: 'ย้าย TB-12 ไป In review แล้ว', onDismiss: fn() },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { tone: 'success' } };
export const ErrorTone: Story = {
  name: 'Error',
  args: { tone: 'error', title: 'ย้ายการ์ดไม่สำเร็จ', description: 'เชื่อมต่อ server ไม่ได้ การ์ดถูกย้อนกลับที่เดิม' },
};
export const Warning: Story = { args: { tone: 'warning', title: 'Session ใกล้หมดอายุ', description: 'กรุณา login ใหม่ภายใน 5 นาที' } };
export const Info: Story = { args: { tone: 'info', title: 'มีหน้า Docs ใหม่ลิงก์กับ TB-12' } };
export const WithAction: Story = {
  args: { tone: 'success', title: 'ลบ comment แล้ว', action: { label: 'Undo', onClick: fn() } },
};

/** ใช้งานจริงผ่าน hook useToast() */
function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast({ tone: 'success', title: 'บันทึกแล้ว' })}>Success</Button>
      <Button variant="danger" onClick={() => toast({ tone: 'error', title: 'เกิดข้อผิดพลาด', description: 'INTERNAL' })}>
        Error
      </Button>
      <Button variant="secondary" onClick={() => toast({ tone: 'info', title: 'คัดลอกลิงก์แล้ว' })}>Info</Button>
    </div>
  );
}

export const WithProvider: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
  parameters: { docs: { story: { inline: false, iframeHeight: 300 } } },
};

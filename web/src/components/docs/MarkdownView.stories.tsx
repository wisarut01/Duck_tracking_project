import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarkdownView } from './MarkdownView';
import { findIssueByKey, issueTB12, pageBoardSpec } from '@/mocks/fixtures';

const meta = {
  title: 'Docs/MarkdownView',
  component: MarkdownView,
  args: { content: pageBoardSpec.contentMd, resolveIssue: findIssueByKey },
  decorators: [(Story) => <div className="max-w-2xl rounded-2xl border border-border bg-surface p-8"><Story /></div>],
} satisfies Meta<typeof MarkdownView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** หน้า Board Spec: TB-12, TB-3 กลายเป็น chip แต่ `TB-99` ใน code ไม่ถูกแปลง */
export const PageContent: Story = {};

export const IssueDescription: Story = { args: { content: issueTB12.description ?? '' } };

/** ไม่ส่ง resolveIssue → chip แสดงแค่ key (เส้นประ) */
export const UnresolvedMentions: Story = { args: { content: 'อ้างอิง TB-12, TB-3 และ MKT-7', resolveIssue: undefined } };

export const Compact: Story = { args: { compact: true, content: 'API `move` พร้อมแล้วใน TB-3 ลองต่อดูได้เลยครับ **ขอบคุณ**' } };

export const EdgeCases: Story = {
  args: {
    content: [
      '## Edge cases ของ mention',
      '',
      '- ปกติ: TB-12 → chip',
      '- ติดวงเล็บ: (TB-4) และท้ายประโยค TB-7.',
      '- ไม่ใช่ key: tb-12, TB12, XTB-12abc',
      '- ใน inline code: `TB-12`',
      '- ในลิงก์เดิม: [ดู TB-12 ที่นี่](https://example.com)',
      '',
      '```',
      'curl /issues/TB-12  # ใน code block ไม่แปลง',
      '```',
    ].join('\n'),
  },
};

export const RichContent: Story = {
  args: {
    content: [
      '# หัวข้อใหญ่ H1',
      '## หัวข้อ H2',
      '### หัวข้อ H3',
      '',
      'ย่อหน้าธรรมดา มี **ตัวหนา**, *ตัวเอียง*, ~~ขีดฆ่า~~, `inline code` และ [ลิงก์ภายนอก](https://example.com)',
      '',
      '- [x] งานที่เสร็จ',
      '- [ ] งานที่ยังไม่เสร็จ',
      '',
      '> Quote: ทุกหน้าว่างต้องบอกว่าทำอะไรต่อได้',
      '',
      '| คอลัมน์ | ความหมาย |',
      '|---|---|',
      '| TODO | ยังไม่เริ่ม |',
      '| DONE | เสร็จแล้ว |',
      '',
      '---',
      '',
      '```ts',
      "const key: string = 'TB-12';",
      '```',
    ].join('\n'),
  },
};

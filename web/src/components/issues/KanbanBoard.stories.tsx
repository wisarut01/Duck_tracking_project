import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { KanbanBoard } from './KanbanBoard';
import { issues } from '@/mocks/fixtures';
import type { MoveIssueRequest } from '@/types/api';

const meta = {
  title: 'Domain/KanbanBoard',
  component: KanbanBoard,
  args: { issues, onMoveIssue: fn(), onOpenIssue: fn(), onAddIssue: fn() },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="bg-dot-grid min-h-screen p-6"><Story /></div>],
} satisfies Meta<typeof KanbanBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ลองลากการ์ดด้วยเมาส์ หรือ Tab ไปที่การ์ด → Space หยิบ → ลูกศร → Space วาง */
export const Default: Story = {};

export const Loading: Story = { args: { issues: [], loading: true } };

export const EmptyBoard: Story = { args: { issues: [] } };

/** แสดง payload ที่จะส่งไป POST /issues/{key}/move หลังวางการ์ด */
export const WithMoveLog: Story = {
  render: function MoveLogBoard(args) {
    const [log, setLog] = useState<{ key: string; move: MoveIssueRequest }[]>([]);
    return (
      <div className="flex flex-col gap-4">
        <KanbanBoard
          {...args}
          onMoveIssue={(key, move) => {
            args.onMoveIssue?.(key, move);
            setLog((current) => [{ key, move }, ...current].slice(0, 5));
          }}
        />
        <div className="max-w-xl rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-ink">POST /issues/&#123;key&#125;/move (ล่าสุด 5 ครั้ง)</p>
          {log.length === 0 ? (
            <p className="text-sm text-ink-muted">ยังไม่มีการย้าย — ลองลากการ์ดดู</p>
          ) : (
            <ul className="flex flex-col gap-1 font-mono text-xs text-ink-muted">
              {log.map((entry, index) => (
                <li key={index}>
                  <b className="text-ink">{entry.key}</b> {JSON.stringify(entry.move)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  },
};

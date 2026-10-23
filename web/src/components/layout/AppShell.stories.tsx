import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppShell } from './AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { projects, spaces, userDuck } from '@/mocks/fixtures';
import { searchFixtures } from '@/mocks/search';

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  args: {
    sidebar: { projects, spaces, activeProjectKey: 'TB', currentUser: userDuck, onLogout: fn() },
    breadcrumbs: [{ label: 'Tracking Board' }, { label: 'Board' }],
    onCreate: fn(),
    search: searchFixtures,
    onSelectIssue: fn(),
    onSelectPage: fn(),
    canvas: true,
    children: (
      <EmptyState
        className="mt-20"
        title="พื้นที่เนื้อหา"
        description="กด ⌘K / Ctrl+K เพื่อค้นหา หรือกดปุ่ม ☰ เพื่อย่อเมนู"
        action={<Button>ตัวอย่างปุ่ม</Button>}
      />
    ),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Canvas: Story = {};
export const PlainBackground: Story = { args: { canvas: false } };
export const CollapsedSidebar: Story = { args: { sidebar: { projects, spaces, activeProjectKey: 'TB', currentUser: userDuck, collapsed: true } } };
export const SearchOpen: Story = { args: { defaultSearchOpen: true, defaultSearchQuery: 'TB-1' } };

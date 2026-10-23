import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Sidebar } from './Sidebar';
import { projects, spaces, userDuck } from '@/mocks/fixtures';

const meta = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  args: {
    projects,
    spaces,
    activeProjectKey: 'TB',
    currentUser: userDuck,
    onCreateProject: fn(),
    onCreateSpace: fn(),
    onLogout: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[640px]"><Story /></div>],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProjectActive: Story = {};
export const SpaceActive: Story = { args: { activeProjectKey: undefined, activeSpaceKey: 'ENG' } };
export const Collapsed: Story = { args: { collapsed: true } };
export const Empty: Story = { args: { projects: [], spaces: [] } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TopBar } from './TopBar';

const meta = {
  title: 'Layout/TopBar',
  component: TopBar,
  args: {
    breadcrumbs: [{ label: 'Tracking Board' }, { label: 'Board' }],
    onOpenSearch: fn(),
    onCreate: fn(),
    onToggleTheme: fn(),
    onToggleSidebar: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DocsBreadcrumb: Story = {
  args: { breadcrumbs: [{ label: 'Engineering' }, { label: 'Product Specs' }, { label: 'Board Spec' }] },
};
export const Minimal: Story = { args: { breadcrumbs: [], onCreate: undefined, onToggleTheme: undefined, onToggleSidebar: undefined } };

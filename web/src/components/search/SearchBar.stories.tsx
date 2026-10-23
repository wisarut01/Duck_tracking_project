import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SearchBar } from './SearchBar';

const meta = {
  title: 'Domain/SearchBar',
  component: SearchBar,
  args: { onOpen: fn() },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomPlaceholder: Story = { args: { placeholder: 'ค้นใน Engineering…' } };

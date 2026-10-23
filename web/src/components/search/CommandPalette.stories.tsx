import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CommandPalette } from './CommandPalette';
import { SearchBar } from './SearchBar';
import { emptySearchResult, searchResultBoard } from '@/mocks/fixtures';
import { searchFixtures } from '@/mocks/search';

const meta = {
  title: 'Domain/CommandPalette',
  component: CommandPalette,
  args: {
    open: true,
    onClose: fn(),
    query: 'board',
    onQueryChange: fn(),
    results: searchResultBoard,
    onSelectIssue: fn(),
    onSelectPage: fn(),
  },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 560 } } },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GroupedResults: Story = {};
export const EmptyQuery: Story = { args: { query: '', results: null } };
export const NoResults: Story = { args: { query: 'sprint', results: emptySearchResult } };
export const Loading: Story = { args: { loading: true } };

/** SearchBar → เปิด palette → ค้นจริงใน fixtures (ลอง "TB-1", "ลาก", "spec") */
export const LiveSearch: Story = {
  args: { open: false },
  render: function LiveSearchStory(args) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    return (
      <div className="p-6">
        <SearchBar onOpen={() => setOpen(true)} />
        <CommandPalette
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          query={query}
          onQueryChange={setQuery}
          results={searchFixtures(query)}
        />
      </div>
    );
  },
};

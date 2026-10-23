import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchResultsScreen } from './SearchResultsScreen';
import { emptySearchResult } from '@/mocks/fixtures';

const meta = {
  title: 'Screens/SearchResults',
  component: SearchResultsScreen,
  args: { defaultQuery: 'board' },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SearchResultsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** พิมพ์คำใหม่ในช่องค้นหาเพื่อค้นใน fixtures */
export const Results: Story = {};
export const ByIssueKey: Story = { args: { defaultQuery: 'TB-1' } };
export const NoResults: Story = { args: { defaultQuery: 'sprint', results: emptySearchResult } };
export const Loading: Story = { args: { loading: true } };
/** Command palette (⌘K) เปิดทับหน้า */
export const CommandPaletteOpen: Story = { args: { paletteOpen: true } };

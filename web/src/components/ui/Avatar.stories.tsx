import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarGroup } from './Avatar';
import { users, userDuck, userPloy } from '@/mocks/fixtures';

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
  args: { user: userDuck, size: 'md' },
  argTypes: { size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] } },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};
export const ThaiName: Story = { args: { user: userPloy } };
export const WithImage: Story = {
  args: {
    user: {
      displayName: 'Sticky Bot',
      // data URI เล็กๆ แทนรูปจริง (ไม่ต้องพึ่งเน็ต)
      avatarUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23FFD02F"/><circle cx="14" cy="17" r="3" fill="%231c1c1e"/><circle cx="26" cy="17" r="3" fill="%231c1c1e"/><path d="M12 26 q8 6 16 0" stroke="%231c1c1e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
    },
  },
};
export const Unassigned: Story = { args: { user: null } };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} user={userDuck} size={size} />
      ))}
    </div>
  ),
};

export const Group: Story = { render: () => <AvatarGroup users={users} max={3} /> };
export const GroupAllVisible: Story = { render: () => <AvatarGroup users={users} max={10} size="sm" /> };

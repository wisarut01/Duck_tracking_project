import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LoginScreen } from './LoginScreen';

const meta = {
  title: 'Screens/Login',
  component: LoginScreen,
  args: { onLogin: fn(), onRegister: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Login: Story = {};
export const Register: Story = { args: { defaultMode: 'register' } };
export const Loading: Story = { args: { loading: true } };
export const InvalidCredentials: Story = { args: { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (UNAUTHENTICATED)' } };

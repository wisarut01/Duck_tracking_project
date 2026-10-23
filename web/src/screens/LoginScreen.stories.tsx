import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LoginScreen } from "./LoginScreen";

const meta = {
  title: "Screens/Login",
  component: LoginScreen,
  args: { onLogin: fn(), onRegister: fn() },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Login: Story = {};
export const Register: Story = { args: { defaultMode: "register" } };
export const Loading: Story = { args: { loading: true } };
export const InvalidCredentials: Story = {
  args: { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง (UNAUTHENTICATED)" },
};

/** production: Google อย่างเดียว (Supabase Auth) */
export const GoogleOnly: Story = {
  args: { onGoogleSignIn: fn(), passwordSignIn: false },
};
export const GoogleNotAllowed: Story = {
  args: {
    onGoogleSignIn: fn(),
    passwordSignIn: false,
    error:
      "stranger@gmail.com is not allowed to use this app — ask the owner to add it",
  },
};
/** มีทั้งสองแบบ */
export const GoogleAndPassword: Story = { args: { onGoogleSignIn: fn() } };

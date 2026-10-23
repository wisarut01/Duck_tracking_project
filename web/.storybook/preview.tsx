import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import { MemoryRouter } from 'react-router';
import { FixtureAppDataProvider } from '../src/mocks/FixtureAppDataProvider';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // พื้นหลังมาจาก CSS ของเราเอง (สลับตามธีม) → ปิด backgrounds ของ Storybook
    backgrounds: { disable: true },
    a11y: {
      // 'todo' = แสดงผล a11y ในแท็บ Accessibility แต่ไม่ทำให้ test fail
      test: 'todo',
    },
    options: {
      storySort: {
        order: ['Introduction', 'Design Tokens', 'Primitives', 'Domain', 'Docs', 'Layout', 'Screens'],
      },
    },
  },
  decorators: [
    // ปุ่มสลับ Light/Dark บน toolbar → ใส่ class "dark" ที่ <html>
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
      parentSelector: 'html',
    }),
    // component ที่ใช้ <Link> ต้องอยู่ใน Router — ใช้ MemoryRouter (ไม่เปลี่ยน URL ของ Storybook)
    // AppData (เมนูซ้าย, ผู้ใช้, ค้นหา) มาจาก fixtures — ในแอปจริงมาจาก API
    (Story) => (
      <MemoryRouter>
        <FixtureAppDataProvider>
          <Story />
        </FixtureAppDataProvider>
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // หา story ทั้ง .mdx (หน้าเอกสาร) และ .stories.tsx ใน src/
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: { name: '@storybook/react-vite', options: {} },
  typescript: { reactDocgen: 'react-docgen-typescript' },
};

export default config;

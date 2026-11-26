// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://catedrathin5g.github.io',
  base: '/Web-5G',
  compressHTML: true,
  build: {
    inlineStylesheets: 'always',

  },
  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 10240,
    }
  },

  integrations: [react()]
});

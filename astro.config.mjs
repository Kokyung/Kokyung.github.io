import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://kokyung.github.io',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  vite: { server: { watch: { ignored: ['**/.migration/**'] } } },
});

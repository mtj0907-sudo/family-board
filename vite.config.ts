import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' : GitHub Pages 하위 주소(/family-board/)에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});

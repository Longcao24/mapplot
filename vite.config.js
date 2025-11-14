import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import functions from 'vite-plugin-functions';

export default defineConfig({
  plugins: [react(), functions()],
});

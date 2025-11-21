import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Preferred port
    strictPort: false, // Automatically use next available port if 5173 is busy
  },
  optimizeDeps: {
    include: ['html2canvas'],
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      '@tiptap/core',
      '@tiptap/pm',
      'prosemirror-model',
      'prosemirror-state',
      'prosemirror-view'
    ],
  },
});

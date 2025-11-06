import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Always use port 5173
    strictPort: true, // Fail if port is already in use
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

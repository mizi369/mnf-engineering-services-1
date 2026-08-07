import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  optimizeDeps: {
    include: ['framer-motion'],
  },
  define: {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || ''),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
 base: './',
 plugins: [react()],
 server: {
 port: 3000,
 host: true,
 proxy: {
 '/api': {
 target: 'http://127.0.0.1:8000',
 changeOrigin: true
 }
 }
 },
 build: {
 rollupOptions: {
 output: {
 manualChunks: {
 'vendor-react': ['react', 'react-dom'],
 'vendor-recharts': ['recharts'],
 'vendor-lucide': ['lucide-react'],
 }
 }
 }
 }
});


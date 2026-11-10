import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [vinext()], server: { open: process.env.CHESSLAB_OPEN_BROWSER === '1' } });

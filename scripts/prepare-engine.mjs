import { mkdir, readdir, copyFile } from 'node:fs/promises';
const dir = new URL('../node_modules/stockfish/bin/', import.meta.url);
const out = new URL('../public/engine/', import.meta.url);
await mkdir(out, { recursive: true });
const files = (await readdir(dir)).filter(n => /^stockfish-.*-lite-single\.(js|wasm)$/.test(n));
if (files.length !== 2) throw new Error('Stockfish Lite não encontrado: confira a versão instalada.');
for (const name of files) await copyFile(new URL(name, dir), new URL(name, out));
await copyFile(new URL('../node_modules/stockfish/Copying.txt',import.meta.url),new URL('COPYING.txt',out));
console.log('Stockfish Lite pronto para uso local.');

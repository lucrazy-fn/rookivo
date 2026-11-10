import {readFile, writeFile} from 'node:fs/promises';
import {Chess} from 'chess.js';
const rows=[];
for(const file of ['a','b','c','d','e']) {
  const text=await readFile(new URL(`../data/openings/${file}.tsv`,import.meta.url),'utf8');
  for(const line of text.trim().split('\n').slice(1)) {
    const [eco,name,pgn]=line.trim().split('\t');
    if(pgn)rows.push({eco,name,pgn});
  }
}
rows.sort((a,b)=>a.pgn.length-b.pgn.length);
const book={};
for(const {eco,name,pgn} of rows) {
  const c=new Chess();c.loadPgn(pgn);
  for(const m of c.history({verbose:true})) {
    const key=m.before.split(' ').slice(0,4).join(' ')+' '+m.from+m.to+(m.promotion||'');
    book[key] ??= `${eco} · ${name}`;
  }
}
await writeFile(new URL('../src/book.json',import.meta.url),JSON.stringify(book));
console.log(`${rows.length} aberturas, ${Object.keys(book).length} lances de livro.`);

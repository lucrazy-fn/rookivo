import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchChess} from '../src/api.mjs';
test('API trata erros, cache e cancelamento', async()=>{
  const real=globalThis.fetch;
  try {
    let count=0;
    globalThis.fetch=async()=>{count++;return {ok:true,json:async()=>({archives:[]})};};
    await fetchChess('test/games/archives'); await fetchChess('test/games/archives'); assert.equal(count,1);
    globalThis.fetch=async()=>({ok:false,status:404});
    await assert.rejects(fetchChess('missing/games/archives'),/não encontrado/);
    globalThis.fetch=async()=>({ok:false,status:429});
    await assert.rejects(fetchChess('limited/games/archives'),/Muitas consultas/);
    const c=new AbortController();c.abort();
    await assert.rejects(fetchChess('aborted/games/archives',c.signal),{name:'AbortError'});
  } finally {globalThis.fetch=real;}
});

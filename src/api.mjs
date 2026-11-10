const cache = new Map();
export async function fetchChess(path, signal) {
  const url = `https://api.chess.com/pub/player/${path}`;
  const cached = cache.get(url);
  if (cached && Date.now() - cached.time < 300000) return cached.value;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
  signal?.addEventListener('abort', abort, {once:true});
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(url, {signal:controller.signal});
    if (!response.ok) throw new Error(response.status === 404 ? 'Usuário ou arquivo não encontrado.' : response.status === 429 ? 'Muitas consultas. Aguarde um pouco e tente novamente.' : `Chess.com indisponível (HTTP ${response.status}).`);
    const value = await response.json(); cache.set(url, {value, time:Date.now()}); return value;
  } catch (e) {
    if (signal?.aborted) throw e;
    if (e.name === 'AbortError') throw new Error('A consulta demorou demais. Tente novamente.');
    if (e instanceof TypeError) throw new Error('Não foi possível conectar ao Chess.com. Verifique a conexão ou importe um PGN.');
    throw e;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

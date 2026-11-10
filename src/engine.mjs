import { parseInfo, terminalScore } from './chess.mjs';

export class Engine {
  constructor() {
    const url = typeof document === 'undefined' ? '/engine/stockfish-19-lite-single.js' : new URL('engine/stockfish-19-lite-single.js', document.baseURI).href;
    this.worker = new Worker(url);
    this.pending = null;
    this.worker.onmessage = e => String(e.data).split('\n').forEach(line => this.pending?.line(line));
    this.worker.onerror = () => this.pending?.fail(new Error('Não foi possível carregar Stockfish. Execute npm install e recarregue.'));
  }
  command(command, accept, milliseconds = 20000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.pending?.fail(new Error('O motor não respondeu. Tente novamente.')), milliseconds);
      const finish = (err, value) => { clearTimeout(timer); this.pending = null; err ? reject(err) : resolve(value); };
      this.pending = { line: line => { const result = accept(line); if (result !== undefined) finish(null, result); }, fail: err => finish(err) };
      this.worker.postMessage(command);
    });
  }
  async init() {
    await this.command('uci', l => l === 'uciok' ? true : undefined);
    this.worker.postMessage('setoption name Hash value 32');
    this.worker.postMessage('setoption name MultiPV value 2');
    this.worker.postMessage('setoption name UCI_ShowWDL value true');
    await this.command('isready', l => l === 'readyok' ? true : undefined);
  }
  async evaluate(fen, time, history, options = {}) {
    const terminal = history && 'terminal' in history ? history.terminal : terminalScore(fen, history); if (terminal) return terminal;
    this.worker.postMessage(`setoption name MultiPV value ${options.searchMoves ? 1 : 2}`);
    this.worker.postMessage(history ? `position fen ${history.startFen} moves ${history.moves.join(' ')}` : `position fen ${fen}`);
    let score, second; const lines = new Map();
    return this.command(`go movetime ${time}${options.searchMoves ? ` searchmoves ${options.searchMoves.join(' ')}` : ''}`, line => {
      const info = parseInfo(line, fen.split(' ')[1]);
      if (info) lines.set(`${info.depth}:${info.multipv}`,info);
      if (info?.multipv===1) score = info;
      if (info?.multipv===2) second = info;
      if (line.startsWith('bestmove ')) {
        if (!score) { this.pending?.fail(new Error('Motor não retornou avaliação.')); return; }
        const best=line.split(' ')[1];
        // Never attach the score of one PV to a different bestmove or mix depths.
        const matching=[...lines.values()].filter(s=>s.pv.split(' ')[0]===best).sort((a,b)=>b.depth-a.depth);
        score=matching[0] || score;
        second=[...lines.values()].find(s=>s.depth===score.depth && s.multipv===2 && s.pv.split(' ')[0]!==best);
        return { ...score, second, best }; 
      }
    }, time + 20000);
  }
  dispose() { this.pending?.fail(new DOMException('Análise interrompida', 'AbortError')); this.worker.terminate(); }
}

export class EngineGroup {
  constructor(count=2) { this.engines=Array.from({length:Math.max(1,Math.min(2,count))},()=>new Engine()); }
  async init() { try { await Promise.all(this.engines.map(e=>e.init())); } catch(error) { this.dispose(); throw error; } }
  evaluate(...args) { return this.engines[0].evaluate(...args); }
  dispose() { this.engines.forEach(e=>e.dispose()); }
}

'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { DEMO, parseGame, classify, LABELS, formatScore, pvSan } from '../src/chess.mjs';
import { EngineGroup } from '../src/engine.mjs';
import { fetchChess } from '../src/api.mjs';
import {ReviewCache, reviewGame} from '../src/review.mjs';
import Piece from './Piece';
import Board from './Board';
import Badge from './Badge';
import ReviewSummary from './ReviewSummary';
import Coach from './Coach';
import PuzzleRush from './PuzzleRush';
import {explainLocal} from '../src/local-coach.mjs';
import {reviewEvidence,mergeReviews} from '../src/ai-review.mjs';
import {moveRows} from '../src/statistics.mjs';

const names: Record<string,string> = {k:'rei',q:'dama',r:'torre',b:'bispo',n:'cavalo',p:'peão'};
const labels: Record<string,string> = LABELS;
const initial = parseGame(DEMO);
const date = (t:number) => new Date(t * 1000).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});

export default function Page() {
  const [game, setGame] = useState(initial);
  const [metadata,setMetadata]=useState<any>(null);
  const [aiReviews,setAiReviews]=useState<Record<number,any>>({});
  const [useAiReviews,setUseAiReviews]=useState(true);
  const [ply, setPly] = useState(0);
  const [analysisTab,setAnalysisTab] = useState('summary');
  const [puzzleRush,setPuzzleRush]=useState(false);
  const [sound,setSound]=useState(true),[clearMarks,setClearMarks]=useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState('');
  const [branch, setBranch] = useState<{fen:string;san:string}[]>([]);
  const [promotion, setPromotion] = useState<{from:string;to:string}|null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [branchScore, setBranchScore] = useState<any>(null);
  const [engineState, setEngineState] = useState('Pronto para analisar');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState(100);
  const cache = useRef(new ReviewCache());
  const [playing, setPlaying] = useState(false);
  const engine = useRef<EngineGroup|null>(null);
  const run = useRef(0);
  const [nick, setNick] = useState('');
  const [user, setUser] = useState('');
  const [archives, setArchives] = useState<string[]>([]);
  const [month, setMonth] = useState('');
  const [games, setGames] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef<AbortController|null>(null);
  const [importing, setImporting] = useState(false);
  const [pgn, setPgn] = useState('');
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const moveRef = useRef<HTMLButtonElement|null>(null);
  const panelRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{if(panelRef.current)panelRef.current.scrollTop=0;},[analysisTab]);
  const fen = branch.at(-1)?.fen || game.fens[ply];
  const board = new Chess(fen);
  const score = branch.length ? branchScore : scores[ply];
  const currentMove = game.moves[ply - 1];
  const engineClasses = useMemo(()=>game.moves.map((m,i)=>classify(scores[i],scores[i+1],m,i>0?scores[i-1]:undefined)),[game,scores]);
  const evidence=useMemo(()=>scores.length===game.fens.length?reviewEvidence(game,scores,engineClasses):game.moves.map(()=>null),[game,scores,engineClasses]);
  const classes:any[]=useMemo(()=>mergeReviews(engineClasses,evidence,aiReviews,useAiReviews),[engineClasses,evidence,aiReviews,useAiReviews]);
  const aiCount=Object.entries(aiReviews).filter(([index,item])=>item.fingerprint===JSON.stringify(evidence[Number(index)])).length;
  const reviewInputs=useMemo(()=>!busy&&scores.length===game.fens.length?evidence.filter(Boolean):[],[evidence,busy,game,scores.length]);
  const classification = !branch.length && currentMove ? classes[ply-1] : null;
  const rows=useMemo(()=>moveRows(game.moves),[game]);
  const selectedLabel=currentMove ? `${currentMove.before.split(' ')[5]}${currentMove.color==='w'?'.':'...'} ${currentMove.san} · ${currentMove.color==='w'?'Brancas':'Pretas'} · ${game.headers[currentMove.color==='w'?'White':'Black']||''}` : 'Posição inicial';
  const localExplanation=useMemo(()=>branch.length?null:explainLocal(currentMove,scores[ply-1],scores[ply],engineClasses[ply-1]),[currentMove,scores,ply,branch.length,engineClasses]);
  const aiContext=useMemo(()=>{
    if(branch.length||!currentMove||!scores[ply-1]||!scores[ply])return null;
    const before=scores[ply-1],after=before.played||scores[ply],base=engineClasses[ply-1];
    return JSON.stringify({lance:currentMove.san,corDoLance:currentMove.color==='w'?'brancas':'pretas',numero:Number(currentMove.before.split(' ')[5]),proximoAJogar:fen.split(' ')[1]==='w'?'brancas':'pretas',posicaoAntes:currentMove.before,posicaoDepois:fen,avaliacaoAntesBrancas:formatScore(before),avaliacaoDepoisBrancas:formatScore(after),profundidade:before.depth,categoria:base?labels[base.kind]:null,motivo:base?.reason,melhorVariante:pvSan(currentMove.before,before.pv||''),varianteJogada:before.played?pvSan(currentMove.before,before.played.pv||''):currentMove.san});
  },[game,scores,ply,branch.length]);
  const legal = selected ? board.moves({square: selected as any, verbose:true}) : [];

  function stop() { run.current++; engine.current?.dispose(); engine.current = null; setBusy(false); }
  function navigate(n:number) { setPly(Math.max(0, Math.min(game.moves.length,n))); setBranch([]); setBranchScore(null); setSelected(''); setPromotion(null); }
  function openGame(text:string, orientation = false, source:any=null) {
    try {
      const parsed = parseGame(text);
      stop(); setAiReviews({}); setMetadata(source); setGame(parsed); setPly(0); setScores([]); setBranch([]); setBranchScore(null); setSelected(''); setFlipped(orientation); setPlaying(false); setProgress(0); setEngineState('Pronto para analisar'); setNotice(''); setImporting(false); setPromotion(null);
      const saved=cache.current.get(parsed.pgn,time);setScores(saved);setProgress(Math.round(saved.length/parsed.fens.length*100));
      if(saved.length)setEngineState(saved.length===parsed.fens.length?'Análise recuperada da memória':'Análise parcial · pronta para continuar');
    } catch { throw new Error('PGN inválido ou variante não suportada. Importe uma partida de xadrez padrão.'); }
  }
  useEffect(() => () => { engine.current?.dispose(); request.current?.abort(); }, []);
  useEffect(() => {
    const el=moveRef.current, list=el?.closest('.moves');
    if(!el||!list)return;
    const item=el.getBoundingClientRect(), box=list.getBoundingClientRect();
    if(item.bottom>box.bottom)list.scrollBy({top:item.bottom-box.bottom,behavior:'smooth'});
    else if(item.top<box.top)list.scrollBy({top:item.top-box.top,behavior:'smooth'});
  }, [ply,analysisTab]);
  useEffect(() => {
    function key(e:KeyboardEvent) {
      if (importing || promotion || (e.target as HTMLElement).closest('input,textarea,select')) return;
      if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
        e.preventDefault(); setPlaying(false);
        navigate(e.key === 'Home' ? 0 : e.key === 'End' ? game.moves.length : ply + (e.key === 'ArrowRight' ? 1 : -1));
      }
    }
    window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key);
  },[ply,game,importing,promotion]);
  useEffect(() => {
    if (!playing) return;
    if (ply === game.moves.length) { setPlaying(false); return; }
    const id = setTimeout(() => navigate(ply+1),900); return () => clearTimeout(id);
  },[playing,ply,game]);

  async function analyze() {
    stop(); const id = run.current;
    const started=performance.now();
    setBusy(true); setNotice(''); setEngineState('Carregando Stockfish…');
    const variation = branch.length > 0;
    const saved=variation?[]:cache.current.get(game.pgn,time);
    if(!variation && saved.length===game.fens.length){setScores(saved);setProgress(100);setEngineState('Análise recuperada da memória · instantânea');setBusy(false);return;}
    if (variation) {setBranchScore(null);setProgress(0);} else {setScores(saved);setProgress(Math.round(saved.length/game.fens.length*100));}
    try {
      const worker = new EngineGroup(variation?1:(navigator.hardwareConcurrency>=4?2:1)); engine.current = worker;
      await worker.init(); if (id !== run.current) return;
      if (variation) { const result = await worker.evaluate(fen,time,undefined); if (id === run.current) { setBranchScore(result); setProgress(100); } }
      else {
        await reviewGame(worker,game,time,cache.current,(result:any[])=>{
          setScores(result);setProgress(Math.round(result.length/game.fens.length*100));
          setEngineState(`Posição ${result.length}/${game.fens.length} · ${Math.max(1,Math.ceil((game.fens.length-result.length)*((performance.now()-started)/Math.max(1,result.length-saved.length))/1000))}s restantes (estimativa)`);
        },()=>id!==run.current);
      }
      if (id === run.current) setEngineState(`Concluída em ${((performance.now()-started)/1000).toFixed(1)}s`);
    } catch (e:any) { if (id === run.current) { setNotice(e.message); setEngineState('Análise interrompida'); } }
    finally { if (id === run.current) { engine.current?.dispose(); engine.current=null; setBusy(false); } }
  }

  async function refineMove() {
    if(!currentMove||branch.length||!scores[ply])return;
    const index=ply-1;
    stop();const id=run.current;setBusy(true);setNotice('');setEngineState('Conferindo o lance selecionado…');
    const worker=new EngineGroup(1);engine.current=worker;
    try {
      await worker.init();if(id!==run.current)return;
      const history={startFen:game.fens[0],moves:game.moves.slice(0,index).map(m=>m.from+m.to+(m.promotion||'')),terminal:game.terminals[index]};
      const result:any=await worker.evaluate(currentMove.before,1200,history);
      if(id!==run.current)return;
      const uci=currentMove.from+currentMove.to+(currentMove.promotion||'');
      const played=result.best===uci?{...result,second:undefined}:await worker.evaluate(currentMove.before,650,history,{searchMoves:[uci]});
      if(id!==run.current)return;
      const updated=[...scores];updated[index]={...result,played,verified:true};
      setScores(updated);cache.current.set(game.pgn,time,updated);setEngineState('Lance conferido com busca ampliada');
    } catch(e:any){if(id===run.current)setNotice(e.message);}
    finally{if(id===run.current){worker.dispose();engine.current=null;setBusy(false);}}
  }

  async function loadMonth(who:string, value:string, signal:AbortSignal) {
    const data = await fetchChess(`${encodeURIComponent(who)}/games/${value}`, signal);
    if (!signal.aborted) { setGames((data.games || []).filter((g:any)=>g.rules === 'chess' && g.pgn).sort((a:any,b:any)=>b.end_time-a.end_time)); setPage(0); }
  }
  async function search(e:React.FormEvent) {
    e.preventDefault(); const who = nick.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,50}$/i.test(who)) { setApiError('Digite um nick válido do Chess.com.'); return; }
    request.current?.abort(); const c = new AbortController(); request.current=c;
    setLoading(true); setApiError(''); setGames([]); setArchives([]); setMonth(''); setUser(who);
    try {
      const data = await fetchChess(`${encodeURIComponent(who)}/games/archives`,c.signal);
      if (c.signal.aborted) return;
      const months = (data.archives || []).map((u:string)=>u.match(/\/(\d{4}\/\d{2})$/)?.[1]).filter(Boolean).reverse();
      setArchives(months);
      if (months.length) { setMonth(months[0]); await loadMonth(who,months[0],c.signal); }
    } catch(e:any) { if (!c.signal.aborted) setApiError(e.message); }
    finally { if (!c.signal.aborted) setLoading(false); }
  }
  async function changeMonth(value:string) {
    request.current?.abort(); const c=new AbortController(); request.current=c; setMonth(value); setLoading(true); setApiError(''); setGames([]);
    try { await loadMonth(user,value,c.signal); } catch(e:any) { if (!c.signal.aborted) setApiError(e.message); } finally { if (!c.signal.aborted) setLoading(false); }
  }
  function move(from:string,to:string,promote?:string) {
    const candidates = board.moves({verbose:true}).filter(m=>m.from===from && m.to===to);
    if (!candidates.length) { setSelected(board.get(to as any)?.color === board.turn() ? to : ''); return; }
    if (candidates.some(m=>m.promotion) && !promote) { setPromotion({from,to}); return; }
    try { const m = board.move({from,to,promotion:promote}); stop(); setPlaying(false); setBranch([...branch,{fen:board.fen(),san:m.san}]); setBranchScore(null); setSelected(''); setPromotion(null); setEngineState('Variação livre'); } catch { setSelected(''); }
  }
  function download() {
    const blob = new Blob([game.pgn],{type:'application/x-chess-pgn'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='rookivo.pgn'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const visibleGames = games.filter(g=>filter === 'all' || g.time_class === filter);
  const files = (flipped ? 'hgfedcba' : 'abcdefgh').split('');
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const whitePercent = score ? 50 + 46 * Math.tanh(score.cp/400) : 50;
  const whiteName=game.headers.White || 'Brancas', blackName=game.headers.Black || 'Pretas';
  const player=(white:boolean)=><div className="player"><span className={'avatar '+(white?'white':'')}><Piece type="k" color={white?'w':'b'}/></span><div><strong>{white?whiteName:blackName}</strong><small>{white?'Peças brancas':'Peças pretas'}{game.headers[white?'WhiteElo':'BlackElo'] ? ` · ${game.headers[white?'WhiteElo':'BlackElo']}`:''}</small></div><span className="player-result">{game.headers.Result || '*'}</span></div>;

  return <div className="shell">
    <header className="topbar"><a href="./" className="brand"><img src="rookivo-icon.svg" alt=""/><span className="brand-name">Rookivo</span></a><div className="header-actions"><button className="quiet puzzle-launch" onClick={()=>setPuzzleRush(true)}>Puzzles</button><button className="quiet" onClick={()=>setAnalysisTab('coach')}>Treinador</button><button className="quiet" onClick={()=>{setImporting(true);setImportError('');}}>Importar PGN</button></div></header>
    <main>
      <div className="workspace">
        <aside className="library panel"><div className="section-heading"><h2>Suas partidas</h2><span className="tag">CHESS.COM</span></div>
          <form onSubmit={search}><label htmlFor="nick">Nome de usuário</label><div className="search"><span>@</span><input id="nick" value={nick} onChange={e=>setNick(e.target.value)} placeholder="Seu nick no Chess.com" autoComplete="off" maxLength={50}/><button className="primary" aria-label="Buscar partidas" type="submit">→</button></div></form>
          <div className="filters"><select aria-label="Mês das partidas" value={month} disabled={!archives.length||loading} onChange={e=>changeMonth(e.target.value)}>{!archives.length && <option value="">Escolha um mês</option>}{archives.map(m=><option key={m} value={m}>{m.split('/').reverse().join('/')}</option>)}</select><select aria-label="Ritmo das partidas" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">Todos os ritmos</option><option value="bullet">Bullet</option><option value="blitz">Blitz</option><option value="rapid">Rápidas</option><option value="daily">Diárias</option></select></div>
          <div aria-live="polite" className="library-status">{loading?'Buscando partidas…':user ? `${visibleGames.length} partidas · ${user}`:'Conecte seu histórico público'}</div>
          {apiError && <div role="alert" className="error">{apiError}<button onClick={()=>setImporting(true)}>Importar PGN</button></div>}
          <div className="game-list">
            {!loading && !visibleGames.length && <div className="empty"><h3>{user?'Nenhuma partida encontrada':'Suas partidas aparecerão aqui'}</h3><p>{user?'Selecione outro mês ou ritmo. Apenas xadrez padrão é exibido.':'Busque um nick do Chess.com ou abra a partida de exemplo.'}</p></div>}
            {visibleGames.slice(page*12,page*12+12).map((g:any)=>{
              const ownWhite = g.white.username.toLowerCase()===user; const own=ownWhite?g.white:g.black; const opponent=ownWhite?g.black:g.white; const result=own.result==='win'?'win':opponent.result==='win'?'loss':'draw';
              return <button key={g.url} className={`game-card ${game.pgn===g.pgn?'active':''}`} onClick={()=>{try{openGame(g.pgn,!ownWhite,g);}catch(e:any){setNotice(e.message);}}}><span className={'result-icon '+result}>{result==='win'?'+':result==='loss'?'−':'='}</span><span><strong>{opponent.username}</strong><small>{g.time_class} · {opponent.rating} · {date(g.end_time)}</small></span><span className="chevron">›</span></button>;
            })}
          </div>
          {visibleGames.length>12 && <div className="pagination"><button disabled={page===0} onClick={()=>setPage(page-1)}>←</button><span>{page+1} / {Math.ceil(visibleGames.length/12)}</span><button disabled={(page+1)*12>=visibleGames.length} onClick={()=>setPage(page+1)}>→</button></div>}
          <button className="demo" onClick={()=>openGame(DEMO)}><span>✦ PARTIDA CLÁSSICA</span><strong>A imortal da ópera <span>↗</span></strong><small>Morphy · Paris, 1858 · Experimentar</small></button>
          <p className="privacy">Sem login. Apenas partidas públicas.<br/>A API pode levar algumas horas para atualizar.</p>
        </aside>
        <section className="board-section">
          <div className="board-title"><span>{game.headers.Event || 'Partida importada'} · {board.turn()==='w'?'Brancas jogam':'Pretas jogam'}</span><button className="icon-button" title="Baixar PGN" aria-label="Baixar PGN" onClick={download}>↓</button></div>
          {player(flipped)}
          <div className="board-wrap"><div className="eval-bar" aria-label={`Avaliação das brancas: ${formatScore(score)}`}><div className="eval-white" style={{height:`${whitePercent}%`,...(flipped?{top:0,bottom:'auto'}:{})}}/><span>{formatScore(score)}</span></div>
            <Board sound={sound} clearMarks={clearMarks} fen={fen} flipped={flipped} selected={selected} setSelected={setSelected} move={move} last={branch.length?null:currentMove} classification={classification}/>
          </div>
          {player(!flipped)}
          <div className="board-tools"><span>Direito: vermelho/amarelo · Ctrl vermelho · Alt azul · Shift verde</span><button aria-pressed={sound} onClick={()=>setSound(!sound)} aria-label={sound?'Silenciar sons':'Ativar sons'}>{sound?'♪ Som ligado':'♪ Som desligado'}</button><button onClick={()=>setClearMarks(n=>n+1)}>Limpar</button></div><div className="board-controls"><button title="Inverter tabuleiro" aria-label="Inverter tabuleiro" onClick={()=>setFlipped(!flipped)}>⇅</button><div><button aria-label="Primeiro lance" disabled={!ply&&!branch.length} onClick={()=>{setPlaying(false);navigate(0);}}>⇤</button><button aria-label="Lance anterior" disabled={!ply&&!branch.length} onClick={()=>{setPlaying(false);navigate(ply-1);}}>‹</button><button className="play" aria-label={playing?'Pausar':'Reproduzir lances'} onClick={()=>{if(ply===game.moves.length)navigate(0);else if(branch.length)navigate(ply);setPlaying(!playing);}}>{playing?'Ⅱ':'▶'}</button><button aria-label="Próximo lance" disabled={ply===game.moves.length&&!branch.length} onClick={()=>{setPlaying(false);navigate(ply+1);}}>›</button><button aria-label="Último lance" disabled={ply===game.moves.length&&!branch.length} onClick={()=>{setPlaying(false);navigate(game.moves.length);}}>⇥</button></div><span>{ply}/{game.moves.length}</span></div>
          {branch.length>0?<div className="variation"><strong>Variação livre</strong><span>{branch.map(m=>m.san).join(' ')}</span><button onClick={()=>{stop();setBranch(branch.slice(0,-1));setBranchScore(null);}}>Desfazer</button><button onClick={()=>navigate(ply)}>Voltar à partida</button></div>:<p className="board-tip">{ply?selectedLabel:'← → para navegar · Clique ou arraste uma peça para explorar'}</p>}
        </section>
        <aside className="analysis panel"><div className="section-heading"><h2>Revisão da partida</h2><span className="tag engine-tag">Stockfish</span></div>
          <div className="engine-options"><label htmlFor="quality">Qualidade da análise</label><select id="quality" disabled={busy} value={time} onChange={e=>{const value=Number(e.target.value);setTime(value);const saved=cache.current.get(game.pgn,value);setScores(saved);setBranchScore(null);setProgress(Math.round(saved.length/game.fens.length*100));setEngineState(saved.length===game.fens.length?'Análise recuperada da memória':'Pronto para analisar');}}><option value={100}>Turbo · rápida</option><option value={350}>Equilibrada</option><option value={1200}>Detalhada</option></select></div>
          <button className={'analyze '+(busy?'running':'')} onClick={busy?()=>{stop();setEngineState('Pausado · resultados parciais');}:analyze}>{busy?'■ Interromper análise':branch.length?'✦ Analisar esta posição':scores.length>0&&scores.length<game.fens.length?'▶ Continuar análise':'✦ Analisar partida'}</button>
          <div className="progress"><div style={{width:`${progress}%`}}/></div><div className="engine-status" aria-live="polite"><span>{engineState}</span>{progress>0&&<span>{progress}%</span>}</div>
          {notice&&<div className="error" role="alert">{notice}</div>}
          <div className="evaluation"><div><small>AVALIAÇÃO DAS BRANCAS</small><strong>{formatScore(score)}</strong></div><span>{score?`Profundidade ${score.depth}`:'Aguardando análise'}</span></div>
          <div className="chart" aria-label="Gráfico da avaliação ao longo da partida"><span className="zero-line"/>{scores.length ? <svg viewBox={`0 0 ${Math.max(1,game.fens.length-1)} 100`} preserveAspectRatio="none" aria-hidden="true"><polyline points={scores.map((s,i)=>`${i},${50-44*Math.tanh(s.cp/400)}`).join(' ')} fill="none" stroke="#b6e38a" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>:<span className="chart-placeholder">O panorama da sua partida aparece aqui</span>}{scores.map((s,i)=><button key={i} className="chart-point" style={{left:`${i/Math.max(1,game.fens.length-1)*100}%`}} title={`Posição ${i}: ${formatScore(s)}`} aria-label={`Ir à posição ${i}, avaliação ${formatScore(s)}`} onClick={()=>{setPlaying(false);navigate(i);}}/>)}</div>
          <div className="analysis-tabs" role="tablist" aria-label="Revisão"><button role="tab" aria-selected={analysisTab==='summary'} onClick={()=>setAnalysisTab('summary')}>Resumo</button><button role="tab" aria-selected={analysisTab==='moves'} onClick={()=>setAnalysisTab('moves')}>Lances</button><button role="tab" aria-selected={analysisTab==='coach'} onClick={()=>setAnalysisTab('coach')}>Treinador</button></div><div className="analysis-content" ref={panelRef}>{aiCount>0&&<div className="ai-review-mode"><span>{aiCount} lances revisados por IA</span><button aria-pressed={useAiReviews} onClick={()=>setUseAiReviews(!useAiReviews)}>{useAiReviews?'Usando IA · voltar ao motor':'Usando motor · aplicar IA'}</button></div>}<div hidden={analysisTab!=='summary'}><ReviewSummary game={game} scores={scores} classes={classes} metadata={metadata} choose={(kind,color)=>{setPlaying(false);let index=classes.findIndex((c,i)=>i>=ply&&c?.kind===kind&&game.moves[i].color===color);if(index<0)index=classes.findIndex((c,i)=>c?.kind===kind&&game.moves[i].color===color);navigate(index+1);}}/></div><div hidden={analysisTab!=='moves'}>          <div className="selected-move"><span className={`color-dot ${currentMove?.color||'w'}`}/>{selectedLabel}</div><div className="move-feedback"><span>{classification?<Badge kind={classification.kind} large/>:<span className="feedback-dot"/>}</span><div><strong>{branch.length?'Explore uma alternativa':classification?labels[classification.kind]:ply?`Lance ${currentMove?.san}`:'Posição inicial'}</strong>{classification?.source==='ai'&&<small className="ai-origin">IA · {classification.provider} · motor: {labels[classification.engineKind]}</small>}<p>{classification?classification.reason: 'Analise para descobrir os momentos decisivos.'}</p></div></div>
          <button className="refine-move" disabled={busy||!currentMove||!!branch.length||!scores[ply]} onClick={refineMove}>Conferir este lance com mais profundidade</button><div className="pv"><small>CONTINUAÇÃO · {board.turn()==='w'?'BRANCAS JOGAM':'PRETAS JOGAM'}</small><p>{score?.pv?pvSan(fen,score.pv):score?'Fim da linha calculada.':'—'}</p></div>
<div className="moves-heading"><h3>Lances</h3><span>{game.moves.length} meios-lances</span></div><div className="move-column-labels"><span></span><span>Brancas</span><span>Pretas</span></div><div className="moves">
            {rows.map((row:any)=><div className="move-row" key={row.number}><span>{row.number}.</span>{['w','b'].map(color=>{const j=row[color];return j===null?<span key={color}/>:<button key={color} aria-label={`${row.number}${color==='w'?'.':'...'} ${game.moves[j].san}, ${color==='w'?'brancas':'pretas'}`} ref={ply===j+1?moveRef:undefined} className={ply===j+1&&!branch.length?'current':''} onClick={()=>{setPlaying(false);navigate(j+1);}}><span>{game.moves[j].san}</span>{classes[j]&&<span className="move-grade"><Badge kind={classes[j]!.kind}/>{classes[j]!.source==='ai'&&<small className="ai-mark">IA</small>}</span>}</button>;})}</div>)}

          </div>
          </div><div hidden={analysisTab!=='coach'}><Coach localExplanation={localExplanation} context={aiContext} moveLabel={selectedLabel} evidence={reviewInputs} selectedPly={ply} onApply={items=>{setAiReviews(previous=>({...previous,...Object.fromEntries(items.map(item=>[item.ply-1,item]))}));setUseAiReviews(true);}}/></div><details className="method"><summary>Como os lances são classificados?</summary><p>Livro: lance presente na base de aberturas. Brilhante: sacrifício favorável detectado por uma heurística. Excelente (!): escolha crítica, com alternativas bem inferiores. Melhor: primeira escolha do motor. Ótimo e bom: perdas pequenas; imprecisão, erro e capivarada: perdas crescentes. Chance perdida: vantagem criada pelo erro anterior e não aproveitada. Comparamos o lance jogado na mesma posição, com variantes na mesma profundidade, e conferimos perdas relevantes. Opções equivalentes a até 0,08 peão também podem ser Melhor. A classificação usa uma estimativa de chances baseada em partidas humanas. Permitir mate evitável e perder uma sequência de mate recebem tratamento próprio. As categorias podem mudar com a profundidade. Precisão Chess.com vem da API quando disponível; caso contrário, usamos uma estimativa baseada na fórmula pública do Lichess. Rating da partida é uma heurística experimental a partir da precisão local e do rating do PGN, disponível após pelo menos 8 lances fora do livro por jogador. Não é uma medição de Elo. Categorias e rating são próprios, não a revisão oficial do Chess.com.</p></details></div>
        </aside>
      </div>
      <footer><span>♞ rookivo <span>· Feito para entender o jogo.</span></span><span>Chess.com PubAPI + Stockfish · Projeto independente</span></footer>
    </main>
    {importing && <div className="modal-backdrop" onClick={()=>setImporting(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setImporting(false);}}><div className="section-heading"><h2 id="import-title">Importar uma partida</h2><button aria-label="Fechar" onClick={()=>setImporting(false)}>×</button></div><p>Cole o PGN exportado do Chess.com ou escolha um arquivo.</p><textarea autoFocus aria-label="Texto PGN" value={pgn} onChange={e=>setPgn(e.target.value)} placeholder={'[White "Você"]\n[Black "Adversário"]\n\n1. e4 e5 2. Nf3 Nc6'}/><input type="file" accept=".pgn,.txt" hidden ref={fileRef} onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.size>2000000){setImportError('Use um PGN de até 2 MB.');return;}setPgn(await f.text());}}}/>{importError&&<div className="error" role="alert">{importError}</div>}<div className="modal-actions"><button onClick={()=>fileRef.current?.click()}>Escolher arquivo</button><button className="primary" onClick={()=>{try{if(!pgn.trim())throw new Error('Cole um PGN primeiro.');openGame(pgn);}catch(e:any){setImportError(e.message);}}}>Abrir partida →</button></div></section></div>}
    {promotion && <div className="modal-backdrop"><section className="modal promotion" role="dialog" aria-modal="true" aria-label="Escolha a promoção"><h2>Promover peão</h2><div>{['q','r','b','n'].map(p=><button aria-label={names[p]} key={p} onClick={()=>move(promotion.from,promotion.to,p)}><Piece type={p} color={board.turn()}/></button>)}</div><button onClick={()=>setPromotion(null)}>Cancelar</button></section></div>}
    {puzzleRush&&<PuzzleRush close={()=>setPuzzleRush(false)}/>} 
  </div>;
}




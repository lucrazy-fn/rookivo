'use client';
import {useState,useRef,useEffect} from 'react';
import {AI_PROVIDERS} from '../src/ai-providers.mjs';
import {LABELS} from '../src/chess.mjs';
import {validateReview} from '../src/ai-review.mjs';

type Props={localExplanation:any;context:string|null;moveLabel:string;evidence:any[];selectedPly:number;onApply:(items:any[])=>void};
export default function Coach({localExplanation,context,moveLabel,evidence,selectedPly,onApply}:Props) {
  const [showLocal,setShowLocal]=useState(false);
  const [provider,setProvider]=useState('openai'),[model,setModel]=useState(''),[key,setKey]=useState('');
  const [answer,setAnswer]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [suggestions,setSuggestions]=useState<any[]>([]),[status,setStatus]=useState(''),[applied,setApplied]=useState(false);
  const pending=useRef<AbortController|null>(null),requestKind=useRef('');
  const providers:Record<string,any>=AI_PROVIDERS,labels:Record<string,string>=LABELS;
  const reviewId=JSON.stringify(evidence);
  useEffect(()=>{pending.current?.abort();setBusy(false);setAnswer('');setError('');setSuggestions([]);setStatus('');setApplied(false);return ()=>pending.current?.abort();},[reviewId,provider,model,key]);
  useEffect(()=>{if(requestKind.current!=='game'){pending.current?.abort();setBusy(false);}setAnswer('');},[context]);
  const selected=context?evidence.find(m=>m.ply===selectedPly):undefined;
  const reviewable=evidence.filter(m=>m.allowedKinds.length>1);
  const configured=key.trim().length>=8&&!!model.trim();
  async function send(controller:AbortController,task:string,payload:string) {
    const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,model:model.trim(),apiKey:key.trim(),context:payload,task}),signal:controller.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível consultar a IA.');
    return result;
  }
  async function explain() {
    if(!context)return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;requestKind.current='explain';
    setBusy(true);setError('');setAnswer('');setStatus('Explicando o lance…');
    try {
      const result=await send(controller,'explain',context);
      if(!controller.signal.aborted){setAnswer(result.text);setStatus('Explicação recebida.');}
    } catch(e:any){if(!controller.signal.aborted){setError(e.message);setStatus('Consulta interrompida.');}}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  async function review(wholeGame:boolean) {
    const moves=wholeGame?reviewable:selected?[selected]:[];
    if(!moves.length)return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;requestKind.current=wholeGame?'game':'move';
    setBusy(true);setError('');setSuggestions([]);setApplied(false);setAnswer('');
    const collected:any[]=[];
    try {
      for(let i=0;i<moves.length;i+=6){
        if(controller.signal.aborted)return;
        const batch=moves.slice(i,i+6);
        setStatus(`Revisando lote ${Math.floor(i/6)+1}/${Math.ceil(moves.length/6)} · ${collected.length}/${moves.length} lances`);
        const result=await send(controller,'classify',JSON.stringify({moves:batch}));
        if(controller.signal.aborted)return;
        const checked=validateReview(JSON.stringify({moves:result.suggestions}),batch);
        collected.push(...checked.map((item:any)=>({...item,provider:providers[provider].name,model:model.trim(),originalKind:batch.find(m=>m.ply===item.ply).engineKind})));
        setSuggestions([...collected]);
      }
      setStatus(`${collected.length} lances revisados. Confira as sugestões antes de aplicar.`);
    } catch(e:any){if(!controller.signal.aborted){setError(e.message);setStatus(`Revisão interrompida · ${collected.length} lances recebidos.`);}}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section className="coach">
    <h3>Entenda o lance com Stockfish</h3>
    <p>Explicação local e gratuita, sem token. Usa as variantes já calculadas.</p>
    <div className="coach-selection">{moveLabel}</div>
    <button className="analyze" disabled={!localExplanation} onClick={()=>setShowLocal(true)}>Explicar com Stockfish</button>
    {!localExplanation&&<p>Analise a partida e selecione um lance da partida para explicar.</p>}
    {showLocal&&localExplanation&&<div className="coach-answer" aria-live="polite"><strong>Explicação do Stockfish · {moveLabel}</strong>{localExplanation.facts.map((text:string,i:number)=><p key={i}>{text}</p>)}{localExplanation.bestLine&&<p><b>Melhor continuação:</b><br/>{localExplanation.bestLine}</p>}{localExplanation.playedLine&&<p><b>Linha do lance jogado:</b><br/>{localExplanation.playedLine}</p>}<small>Profundidade {localExplanation.depth}. Texto gerado por regras a partir da posição e da análise; não é uma explicação escrita pelo motor. Uma busca mais profunda pode mudar a avaliação.</small></div>}
    {typeof document !== 'undefined'&&document.documentElement.classList.contains('static-pages')&&<p className="coach-privacy">Nesta versão do GitHub Pages, a IA externa não está disponível. A explicação com Stockfish funciona aqui mesmo no navegador.</p>}
    <div className="remote-coach"><hr/>
    <h3>IA opcional para explicar e revisar os rótulos</h3>
    <p>O Stockfish calcula as variantes. A IA pode sugerir outra classificação compatível com essas evidências. Você decide se aplica.</p>
    <label htmlFor="ai-provider">Serviço de IA</label><select id="ai-provider" value={provider} onChange={e=>{setProvider(e.target.value);setKey('');setModel('');}}>{Object.entries(providers).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select>
    <label htmlFor="ai-key">Chave de API (token)</label><input id="ai-key" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Cole seu token aqui" autoComplete="off" spellCheck={false} maxLength={512}/>
    <label htmlFor="ai-model">Modelo <a href={providers[provider].docs} target="_blank" rel="noreferrer">Ver IDs dos modelos ↗</a></label><input id="ai-model" value={model} onChange={e=>setModel(e.target.value)} placeholder="Cole o ID do modelo da sua conta" maxLength={150} autoComplete="off" spellCheck={false}/>
    <p className="coach-privacy">A chave fica apenas nesta sessão. As posições e análises são enviadas ao serviço escolhido somente ao clicar nos botões abaixo. O serviço pode cobrar pelo uso.</p>
    {key&&<button className="forget-key" onClick={()=>{setKey('');setAnswer('');}}>Apagar chave da sessão</button>}
    <div className="coach-selection">{context?moveLabel:'Analise a partida e selecione um lance para explicar.'}</div>
    <div className="coach-actions">
      <button className="analyze" disabled={!context||!configured||busy} onClick={explain}>Explicar com IA externa</button>
      <button className="refine-move" disabled={!selected||!configured||busy||selected.allowedKinds.length===1} onClick={()=>review(false)}>Revisar classificação deste lance</button>
      <button className="refine-move" disabled={!reviewable.length||!configured||busy} onClick={()=>review(true)}>Revisar classificações da partida</button>
    </div>
    <p className="coach-privacy">{evidence.length?`Partida: até ${Math.ceil(reviewable.length/6)} chamadas, em lotes de 6. Lances de livro e casos sem outra categoria compatível são preservados.`:'Conclua a análise do Stockfish para habilitar a revisão dos rótulos.'} A IA não reproduz o algoritmo do Chess.com e pode errar.</p>
    {status&&<p role="status">{status}</p>}
    {busy&&<button onClick={()=>{pending.current?.abort();setBusy(false);setStatus('Cancelado. Sugestões já recebidas foram mantidas.');}}>Cancelar consulta</button>}
    {error&&<p className="error" role="alert">{error}</p>}
    {!!suggestions.length&&<div className="ai-suggestions"><h4>Sugestões da IA · {suggestions.filter(s=>s.kind!==s.originalKind).length} alterações</h4><div className="ai-suggestions-list">{suggestions.map(s=><article key={s.ply}><strong>{evidence.find(m=>m.ply===s.ply)?.number}{evidence.find(m=>m.ply===s.ply)?.color==='brancas'?'.':'...'} {evidence.find(m=>m.ply===s.ply)?.move} · {evidence.find(m=>m.ply===s.ply)?.color}<br/>{labels[s.originalKind]} → {labels[s.kind]}</strong><p>{s.reason}</p></article>)}</div><button className="analyze" disabled={busy||applied} onClick={()=>{onApply(suggestions);setApplied(true);}}>{applied?'Aplicadas · veja Resumo ou Lances':'Aplicar sugestões ao resumo'}</button><p>Os rótulos aplicados recebem a marca IA. A precisão e o rating não são alterados pela IA.</p></div>}
    {answer&&<div className="coach-answer" aria-live="polite"><strong>Explicação da IA</strong><p>{answer}</p><small>A explicação pode conter erros; confira as variantes no tabuleiro.</small></div>}</div>
  </section>;
}

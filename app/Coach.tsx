'use client';
import {useState} from 'react';

type Props={localExplanation:any;moveLabel:string};
export default function Coach({localExplanation,moveLabel}:Props) {
  const [showLocal,setShowLocal]=useState(false);
  return <section className="coach">
    <h3>Entenda o lance com Stockfish</h3>
    <p>Explicação local e gratuita, usando a posição e as variantes calculadas no navegador.</p>
    <div className="coach-selection">{moveLabel}</div>
    <button className="analyze" disabled={!localExplanation} onClick={()=>setShowLocal(true)}>Explicar com Stockfish</button>
    {!localExplanation&&<p>Analise a partida e selecione um lance para explicar.</p>}
    {showLocal&&localExplanation&&<div className="coach-answer" aria-live="polite"><strong>Explicação do Stockfish · {moveLabel}</strong>{localExplanation.facts.map((text:string,i:number)=><p key={i}>{text}</p>)}{localExplanation.bestLine&&<p><b>Melhor continuação:</b><br/>{localExplanation.bestLine}</p>}{localExplanation.playedLine&&<p><b>Linha do lance jogado:</b><br/>{localExplanation.playedLine}</p>}<small>Profundidade {localExplanation.depth}. Texto gerado por regras a partir da posição e da análise; uma busca mais profunda pode mudar a avaliação.</small></div>}
  </section>;
}

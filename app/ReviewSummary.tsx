import Piece from './Piece';
import Badge from './Badge';
import {LABELS} from '../src/chess.mjs';
import {gameStatistics,officialAccuracy} from '../src/statistics.mjs';
import {useMemo} from 'react';

export default function ReviewSummary({game,scores,classes,metadata,choose}:{game:any;scores:any[];classes:any[];metadata:any;choose:(kind:string,color:string)=>void}) {
  const stats=useMemo(()=>gameStatistics(game,scores),[game,scores]);
  const colors=['w','b'];
  return <div className="review-summary review-v4">
    <div className="review-players"><span>Jogadores</span>{colors.map(color=><div key={color} className={`review-player ${color}`}>
      <span className="color-piece"><Piece type="k" color={color}/></span>
      <strong title={game.headers[color==='w'?'White':'Black']}>{game.headers[color==='w'?'White':'Black']||color}</strong><small>{color==='w'?'Brancas':'Pretas'}</small>
    </div>)}</div>
    <div className="metric-row"><span>Precisão</span>{colors.map(color=>{
      const official=officialAccuracy(metadata,color),value=official??stats[color].accuracy;
      return <div key={color}><strong className={`accuracy-value ${color}`}>{value===null?'—':value.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:official!==null?2:1})}</strong><small>{official!==null?'Chess.com':value!==null?'estimada':'após análise'}</small></div>;
    })}</div>
    <div className="metric-row rating-row"><span>Rating da partida<small>estimativa experimental</small></span>{colors.map(color=><div key={color} title="Heurística própria de precisão e rating do PGN; não mede seu Elo nem reproduz o Chess.com."><strong>{stats[color].rating===null?'—':`≈ ${stats[color].rating}`}</strong></div>)}</div>
    <div className="grade-table">{Object.entries(LABELS).map(([kind,label])=><div className={`grade-row ${kind}`} key={kind}><span>{label}</span>{['w','icon','b'].map(side=>side==='icon'?<Badge key={side} kind={kind}/>:<button key={side} aria-label={`Ver ${label}: ${side==='w'?'brancas':'pretas'}`} disabled={!classes.some((c,i)=>c?.kind===kind&&game.moves[i].color===side)} onClick={()=>choose(kind,side)}>{classes.filter((c,i)=>c?.kind===kind&&game.moves[i].color===side).length}</button>)}</div>)}</div>
  </div>;
}

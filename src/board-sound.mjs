import {Chess} from 'chess.js';
import {boardMotion} from './board-motion.mjs';

export function moveSound(previous,next){
  if(!boardMotion(previous,next).length)return null;
  const board=new Chess(next);
  if(board.isCheckmate())return 'mate';
  if(board.isCheck())return 'check';
  const count=fen=>new Chess(fen).board().flat().filter(Boolean).length;
  return count(next)<count(previous)?'capture':'move';
}

// Original synthesized cues; no downloads, audio files or third-party samples.
export function playCue(context,kind){
  if(context.state!=='running')return;
  const now=context.currentTime;
  const notes=kind==='mate'?[[523,0,.15],[659,.12,.15],[784,.24,.3]]:kind==='check'?[[880,0,.11],[1175,.1,.16]]:kind==='capture'?[[160,0,.13],[95,.035,.15]]:[[260,0,.09]];
  for(const [frequency,delay,duration] of notes){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=kind==='capture'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(frequency,now+delay);
    if(kind==='move'||kind==='capture')oscillator.frequency.exponentialRampToValueAtTime(frequency*.45,now+delay+duration);
    gain.gain.setValueAtTime(.0001,now+delay);
    gain.gain.exponentialRampToValueAtTime(.8,now+delay+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(now+delay);oscillator.stop(now+delay+duration+.01);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}

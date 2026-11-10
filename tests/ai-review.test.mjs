import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame,classify} from '../src/chess.mjs';
import {reviewEvidence,validateReview,mergeReviews} from '../src/ai-review.mjs';
import {coachResponse,providerRequest} from '../src/coach.mjs';

const game=parseGame('1. a3 a6 2. Ra2 *');
function fixture() {
  const scores=game.fens.map(()=>({cp:0,depth:14,best:'e2e4',pv:''}));
  scores[2]={cp:40,depth:14,best:'b2b3',pv:'b2b3',played:{cp:0,depth:14,pv:'a1a2'}};
  const grades=game.moves.map((m,i)=>classify(scores[i],scores[i+1],m));
  return {scores,grades,evidence:reviewEvidence(game,scores,grades)};
}

test('IA recebe apenas categorias compatíveis; livro e mate não viram brilhante',()=>{
  const {evidence}=fixture();
  assert.deepEqual(evidence[0].allowedKinds,['book']);
  assert.ok(evidence[2].allowedKinds.includes('good'));
  assert.ok(!evidence[2].allowedKinds.includes('brilliant'));
  assert.ok(!evidence[2].allowedKinds.includes('best'));
  assert.equal(evidence[1].color,'pretas');assert.equal(evidence[2].number,2);
  const {scores,grades}=fixture();scores[2].played={cp:-9998,mate:-2,depth:14};
  const mateEvidence=reviewEvidence(game,scores,grades)[2];
  assert.deepEqual(mateEvidence.allowedKinds,['blunder']);
});

test('aplicar e reverter IA preserva motor; reanálise invalida sugestões antigas',()=>{
  const {scores,grades,evidence}=fixture();
  const suggestion=validateReview(JSON.stringify({moves:[{ply:3,kind:'good',reason:'A perda pequena mantém a posição equilibrada.'}]}),[evidence[2]])[0];
  const reviews={2:{...suggestion,provider:'teste',model:'modelo'}};
  const merged=mergeReviews(grades,evidence,reviews);
  assert.equal(merged[2].source,'ai');assert.equal(merged[2].engineKind,grades[2].kind);
  assert.equal(grades[2].source,undefined);
  assert.strictEqual(mergeReviews(grades,evidence,reviews,false)[2],grades[2]);
  scores[2].depth=18;
  assert.strictEqual(mergeReviews(grades,reviewEvidence(game,scores,grades),reviews)[2],grades[2]);
});

test('resposta incompleta, duplicada, inventada ou para outro lance é rejeitada',()=>{
  const {evidence}=fixture(),move=evidence[2];
  for(const moves of [[],[{ply:999,kind:'good',reason:'Uma razão válida.'}],[{ply:3,kind:'brilliant',reason:'Sacrifício inventado.'}],[{ply:3,kind:'unknown',reason:'Categoria inventada.'}],[{ply:3,kind:'good',reason:'x'}]])assert.throws(()=>validateReview(JSON.stringify({moves}),[move]));
  const one={ply:3,kind:'good',reason:'Razão suficientemente longa.'};
  assert.throws(()=>validateReview(JSON.stringify({moves:[one,one]}),[move,{...move,ply:4}]));
  assert.equal(validateReview('```json\n'+JSON.stringify({moves:[one]})+'\n```',[move]).length,1);
});

test('classificação estruturada funciona nos cinco formatos sem chamadas reais',async()=>{
  const {evidence}=fixture(),batch=[evidence[2]],text=JSON.stringify({moves:[{ply:3,kind:'good',reason:'Mantém chances semelhantes à melhor alternativa.'}]});
  const replies={openai:{output:[{type:'message',content:[{type:'output_text',text}]}]},xai:{output:[{type:'message',content:[{type:'output_text',text}]}]},gemini:{candidates:[{content:{parts:[{text}]}}]},anthropic:{content:[{type:'text',text}]},openrouter:{choices:[{message:{content:text}}]}};
  for(const provider of Object.keys(replies)) {
    const body={provider,apiKey:'fake-test-key',model:'example-model',task:'classify',context:JSON.stringify({moves:batch})};
    const req=new Request('http://localhost:5173/api/coach',{method:'POST',headers:{origin:'http://localhost:5173','content-type':'application/json'},body:JSON.stringify(body)});
    const response=await coachResponse(req,async(url,options)=>{
      assert.ok(options.body.includes('allowedKinds'));assert.ok(!options.body.includes('fake-test-key'));
      return Response.json(replies[provider]);
    });
    assert.equal(response.status,200);assert.equal((await response.json()).suggestions[0].kind,'good');
  }
  assert.throws(()=>providerRequest('openai','fake-test-key','example','{"moves":[]}','classify'));
  assert.throws(()=>providerRequest('openai','fake-test-key','example',JSON.stringify({moves:Array(7).fill(batch[0])}),'classify'));
});

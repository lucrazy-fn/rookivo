import test from 'node:test';
import assert from 'node:assert/strict';
import {coachResponse,providerRequest,responseText} from '../src/coach.mjs';

const request=(provider='openai',origin='http://localhost:5173')=>new Request('http://localhost:5173/api/coach',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({provider,apiKey:'fake-test-key',model:'example-model',context:'{"corDoLance":"pretas"}'})});
test('cinco provedores: autenticação, payload e extração de respostas',async()=>{
  const replies={openai:{output:[{type:'message',content:[{type:'output_text',text:'Explicação'}]}]},xai:{output:[{type:'message',content:[{type:'output_text',text:'Explicação'}]}]},gemini:{candidates:[{content:{parts:[{text:'Explicação'}]}}]},anthropic:{content:[{type:'text',text:'Explicação'}]},openrouter:{choices:[{message:{content:'Explicação'}}]}};
  for(const provider of Object.keys(replies)){
    const res=await coachResponse(request(provider),async(url,options)=>{
      assert.equal(new URL(url).protocol,'https:');assert.ok(!url.includes('fake-test-key'));
      const body=JSON.parse(options.body);assert.ok(!options.body.includes('fake-test-key'));
      if(provider==='gemini')assert.equal(options.headers['x-goog-api-key'],'fake-test-key');
      else if(provider==='anthropic')assert.equal(options.headers['x-api-key'],'fake-test-key');
      else assert.equal(options.headers.Authorization,'Bearer fake-test-key');
      if(provider==='openai'||provider==='xai')assert.equal(body.store,false);
      assert.equal(options.redirect,'error');
      return Response.json(replies[provider]);
    });
    assert.equal(res.status,200);assert.equal((await res.json()).text,'Explicação');
    assert.equal(res.headers.get('cache-control'),'no-store');
  }
});
test('rota recusa outra origem e não expõe chaves ou erros crus do provedor',async()=>{
  const denied=await coachResponse(request('openai','https://another.example'),()=>assert.fail('não deve consultar provedor'));
  assert.equal(denied.status,403);
  const bad=await coachResponse(request('unknown'),()=>assert.fail('provedor arbitrário'));
  assert.equal(bad.status,400);
  for(const status of [401,429,500]){
    const res=await coachResponse(request(),async()=>new Response('fake-test-key',{status}));
    assert.equal(res.status,502);assert.ok(!(await res.text()).includes('fake-test-key'));
  }
  assert.throws(()=>providerRequest('openai','fake-test-key','../../hack','{}'));
  assert.throws(()=>responseText({},'responses'));
});

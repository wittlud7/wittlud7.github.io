import assert from 'node:assert/strict';
const base=process.env.API_TEST_BASE||'http://127.0.0.1:4330';
const A=crypto.getRandomValues(new Uint8Array(32)),B=crypto.getRandomValues(new Uint8Array(32));
const token=x=>Array.from(x,n=>n.toString(16).padStart(2,'0')).join('');
async function call(path,{body,method=body?'POST':'GET',actor=A,origin='https://wittlud7.github.io',auth=true}={}){
 const r=await fetch(base+path,{method,headers:{Origin:origin,...(auth?{Authorization:'Bearer '+token(actor)}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});
 return {status:r.status,data:await r.json(),headers:r.headers};
}
assert.equal((await call('/car/api/sessions',{auth:false})).status,401);
assert.equal((await call('/car/api/sessions',{origin:'https://untrusted.invalid'})).status,403);
const session=await call('/car/api/session/new',{body:{}});assert.equal(session.status,200);
assert.equal((await call('/car/api/session/'+session.data.id)).status,200);
assert.equal((await call('/car/api/session/'+session.data.id,{actor:B})).status,404);
const profileA=await call('/game/api/profile'),profileB=await call('/game/api/profile',{actor:B});
assert.equal(profileA.status,200);assert.equal(profileB.status,200);assert.notEqual(JSON.stringify(profileA.data),JSON.stringify(profileB.data));
const state={version:1,entries:[],customWorks:[],journal:[],projects:[],memories:[],demo:false};
const saved=await call('/echo/api/vault',{method:'PUT',body:{revision:0,state}});assert.equal(saved.status,200);
assert.equal((await call('/echo/api/vault')).data.revision,1);
assert.equal((await call('/echo/api/vault',{actor:B})).data.state,null);
assert.equal((await call('/echo/api/vault',{method:'PUT',body:{revision:0,state}})).status,409);
assert.equal((await call('/travel/api/community/profile',{method:'PUT',body:{nickname:'迁移验收'}})).status,200);
assert.equal((await call('/travel/api/community/me')).data.nickname,'迁移验收');
assert.equal((await call('/travel/api/community/me',{actor:B})).data.nickname,'');
assert.equal((await call('/xiaoli/api/config')).status,200);
console.log('PASS: CORS, required identity, car session isolation, player identity, vault isolation/CAS, community identity, study config.');

if(process.env.TEST_AI==='1'){
 const guide=await call('/travel/api/guide',{body:{message:'请根据资料介绍越王勾践剑的一个观察细节。',context:'goujian-sword'}});assert.equal(guide.status,200,JSON.stringify(guide.data));assert.ok(guide.data.answer?.length>20);console.log('PASS: deployed guide AI, references='+guide.data.references?.length);
 const car=await call('/car/api/chat',{body:{session_id:session.data.id,message:'预算十万元以内，想找一辆在售的家用自动挡二手车，请先确认需求。'}});assert.equal(car.status,200,JSON.stringify(car.data));assert.ok(car.data.turns?.length);console.log('PASS: deployed car AI and session persistence');
 const sources=[{id:'acceptance-source',name:'公开验收资料',content:'光合作用是绿色植物利用光能，把二氧化碳和水转化成有机物并释放氧气的过程。叶绿体是光合作用的主要场所。光照强度、二氧化碳浓度与温度会影响光合作用速率。资料仅用于独立部署验收。'}];
 for(const kind of ['brief','map','cards','podcast']){const r=await call('/xiaoli/api/study/generate',{body:{kind,sources,goal:'依据资料复习光合作用，保留原文引用'}});assert.equal(r.status,200,kind+': '+JSON.stringify(r.data));assert.equal(r.data.kind,kind);assert.ok(r.data.references?.length);console.log('PASS: deployed study AI '+kind+' with source references');}
 const answer=await call('/xiaoli/api/study/ask',{body:{sources,question:'光合作用的主要场所是什么？'}});assert.equal(answer.status,200,JSON.stringify(answer.data));console.log('PASS: deployed source-grounded AI question answering');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {sameOrigin} from '../lib/http';
test('same-origin validation uses browser-facing host when Next normalizes loopback URLs',()=>{
 const request=new NextRequest('http://localhost:3100/api/portal',{headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'}});
 assert.equal(sameOrigin(request),true);
});
test('same-origin validation rejects foreign, missing and insecure origins',()=>{
 for(const origin of ['https://attacker.example','null','http://preview.example','']){
  const request=new NextRequest('https://preview.example/api/portal',{headers:{host:'preview.example',...(origin?{origin}:{})}});
  assert.equal(sameOrigin(request),false);
 }
});

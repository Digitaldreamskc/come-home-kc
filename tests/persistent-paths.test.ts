import {test} from 'node:test';import assert from 'node:assert/strict';
import {pathCommand} from '../lib/paths/persistent';import {safeAuthDestination} from '../lib/onboarding';
const id='f8000000-0000-4000-8000-000000000001';
test('persistent commands reject actor, tenant, consent wording and arbitrary state injection',()=>{for(const key of ['actor','role','tenant_id','user_id','state','consent_wording','version'])assert.equal(pathCommand.safeParse({type:'transition',attempt_id:id,to:'submitted',[key]:'spoof'}).success,false);});
test('persistent commands constrain payload length and require explicit boolean choices',()=>{assert.equal(pathCommand.safeParse({type:'draft',first_edge:id,second_edge:id,note:'x'.repeat(501),opportunity:''}).success,false);assert.equal(pathCommand.safeParse({type:'confirm',edge_id:id,visible:'true',willing:true}).success,false);});
test('connections sign-in return is exact and cannot become an external redirect',()=>{assert.equal(safeAuthDestination('/connections'),'/connections');assert.equal(safeAuthDestination('//evil.example/connections'),'/portal');assert.equal(safeAuthDestination('/connections?next=https://evil.example'),'/portal');});

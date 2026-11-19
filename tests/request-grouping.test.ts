import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupRequests} from '../lib/paths/presentation';
import type {PersistentAttempt} from '../lib/paths/persistent';
const row=(id:string,state:string,request_id=id,attempt_no=1)=>({id,state,request_id,attempt_no,invalidated_at:['cancelled','changes_requested'].includes(state)?'2026-11-18':null} as PersistentAttempt);
test('closed requests collapse while live follow-up and fresh revision actions stay visible',()=>{
 const rows=[row('closed','cancelled'),row('done','completed'),row('live','introduced'),row('returned','changes_requested')];
 const groups=groupRequests(rows);
 assert.deepEqual(groups.current.map(a=>a.id),['returned','live']);
 assert.deepEqual(groups.earlier.map(a=>a.id),['done','closed']);
 assert.equal(rows[0].id,'closed');
});
test('superseded returned attempt moves to earlier requests without hiding the new draft',()=>{
 const groups=groupRequests([row('v1','changes_requested','same',1),row('v2','draft','same',2)]);
 assert.deepEqual(groups.current.map(a=>a.id),['v2']);assert.deepEqual(groups.earlier.map(a=>a.id),['v1']);
});

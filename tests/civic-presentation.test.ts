import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journeyProgress,demonstrationNote} from '../lib/platform/presentation';
import type {ProgramWorkspace} from '../lib/platform/program';
test('interest alone never marks activation or measurement complete',()=>{
 const data={profile:null,connections:[],records:[{kind:'interest'}]} as unknown as ProgramWorkspace;
 assert.deepEqual(journeyProgress(data).map(s=>s.complete),[false,false,false,true,false,false]);
 assert.match(journeyProgress(data)[5].text,/Not started/);
});
test('reported participation remains distinct from independently measured impact',()=>{
 const data={profile:{name:'Example'},connections:[{state:'introduced'}],records:[{kind:'learning'},{kind:'interest'},{kind:'outcome'}]} as unknown as ProgramWorkspace;
 assert.deepEqual(journeyProgress(data).map(s=>s.complete),[true,true,true,true,true,false]);
});
test('only exact known fixture annotations change for display',()=>{
 assert.equal(demonstrationNote('Synthetic interest: I would like to learn about the responsibilities of this board.'),'I would like to learn about the responsibilities of this board.');
 assert.equal(demonstrationNote('Synthetic interest: my own research'),'Synthetic interest: my own research');
});

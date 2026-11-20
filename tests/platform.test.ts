import {test} from 'node:test';
import assert from 'node:assert/strict';
import {civicWorkspaceGranted} from '../lib/platform/civic-access';
import {modeAllows,civic,civicProgram} from '../lib/platform/config';
import {tenant} from '../lib/tenant-config';
import {programCommand} from '../lib/platform/program';
test('standalone applications cannot access each other or the showcase',()=>{for(const path of ['/civic','/civic/profile','/api/civic/program','/showcase'])assert.equal(modeAllows('back2kc',path,true,true),false);for(const path of ['/portal','/api/connections','/login','/showcase'])assert.equal(modeAllows('kcnow',path,true,true),false);assert.equal(modeAllows('showcase','/api/civic/program',true,true),false);});
test('optional modes fail closed when disabled or unknown',()=>{assert.equal(modeAllows('kcnow','/civic',false,true),false);assert.equal(modeAllows('showcase','/showcase',true,false),false);assert.equal(modeAllows('bogus','/',true,true),false);assert.equal(modeAllows('back2kc','/connections',false,false),true);});
test('independent civic config has distinct identity and stage model',()=>{assert.notEqual(civic.id,tenant.id);assert.notEqual(civic.tokens.ink,tenant.tokens.ink);assert.equal(civic.logo,null);assert.equal(civic.synthetic,true);assert.deepEqual(civicProgram.stages,['Identify','Educate','Connect','Match','Activate','Measure']);assert.equal(civic.modules.ai,false);});
test('civic sign-in keeps only accounts the workspace check accepts',()=>{assert.equal(civicWorkspaceGranted(true),true);assert.equal(civicWorkspaceGranted(false),false);});
test('program commands reject actor spoofing and implied consent',()=>{const c={type:'interest',catalog_id:'c3500000-0000-4000-8000-000000000002',consent:true,note:''};assert.equal(programCommand.safeParse(c).success,true);assert.equal(programCommand.safeParse({...c,role:'admin'}).success,false);assert.equal(programCommand.safeParse({...c,consent:false}).success,false);assert.equal(programCommand.safeParse({...c,tenant_id:civic.id}).success,false);});


test('availability commands allow only closure and preserve server-owned decision fields',()=>{
 const id='c3500000-0000-4000-8000-000000000002';
 assert.equal(programCommand.safeParse({type:'catalog_status',id,state:'closed'}).success,true);
 assert.equal(programCommand.safeParse({type:'catalog_status',id,state:'approved'}).success,false);
 assert.equal(programCommand.safeParse({type:'withdraw_interest',id}).success,true);
 assert.equal(programCommand.safeParse({type:'withdraw_interest',id,user_id:id}).success,false);
});

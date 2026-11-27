import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isolatedDatabase,liveAccountsAllowed,reviewUserAllowed} from '../lib/platform/preview-access';

test('live accounts require explicit production host and separate database',()=>{
 const config={VERCEL:'1',VERCEL_ENV:'production',ENABLE_LIVE_ACCOUNTS:'1',ENABLE_PROTECTED_PREVIEW:'0',LIVE_ACCOUNTS_HOST:'accounts.example.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://live.example.invalid',LIVE_ACCOUNTS_SUPABASE_URL:'https://live.example.invalid',GMAIL_DELIVERY_ENABLED:'false'};
 const saved=Object.fromEntries(Object.keys(config).map(key=>[key,process.env[key]]));
 try{
  Object.assign(process.env,config);
  assert.equal(liveAccountsAllowed(config.LIVE_ACCOUNTS_HOST),true);
  assert.equal(liveAccountsAllowed('other.example.invalid'),false);
  assert.equal(reviewUserAllowed('participant@example.invalid'),true);
  assert.equal(reviewUserAllowed(undefined),false);
  process.env.ENABLE_LIVE_ACCOUNTS='0';
  assert.equal(liveAccountsAllowed(config.LIVE_ACCOUNTS_HOST),false);
  process.env.ENABLE_LIVE_ACCOUNTS='1';
  process.env.VERCEL_ENV='preview';
  assert.equal(liveAccountsAllowed(config.LIVE_ACCOUNTS_HOST),false);
  process.env.VERCEL_ENV='production';
  process.env.NEXT_PUBLIC_SUPABASE_URL=isolatedDatabase;
  process.env.LIVE_ACCOUNTS_SUPABASE_URL=isolatedDatabase;
  assert.equal(liveAccountsAllowed(config.LIVE_ACCOUNTS_HOST),false);
 }finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

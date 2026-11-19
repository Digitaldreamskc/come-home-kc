import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hostedReviewAllowed,reviewUserAllowed,isolatedDatabase} from '../lib/platform/preview-access';
test('hosted review fails closed outside exact isolated preview configuration',()=>{
 const original={...process.env};
 try{
  Object.assign(process.env,{VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:'review.example.vercel.app',ENABLE_PROTECTED_PREVIEW:'1',NEXT_PUBLIC_SUPABASE_URL:isolatedDatabase,CIVIC_SUPABASE_URL:isolatedDatabase,GMAIL_DELIVERY_ENABLED:'false',REVIEW_ALLOWED_EMAILS:'mary@socialbalances.com,jessica@socialbalances.com'});
  assert.equal(hostedReviewAllowed('review.example.vercel.app'),true);
  assert.equal(hostedReviewAllowed('other.vercel.app'),false);
  assert.equal(reviewUserAllowed('jessica@socialbalances.com'),true);
  assert.equal(reviewUserAllowed('outsider@example.test'),false);
  assert.equal(reviewUserAllowed(undefined),false);
  process.env.VERCEL_ENV='production';assert.equal(hostedReviewAllowed('review.example.vercel.app'),false);assert.equal(reviewUserAllowed('mary@socialbalances.com'),false);
  process.env.VERCEL_ENV='preview';process.env.GMAIL_DELIVERY_ENABLED='true';assert.equal(hostedReviewAllowed('review.example.vercel.app'),false);
  process.env.GMAIL_DELIVERY_ENABLED='false';process.env.CIVIC_SUPABASE_URL='https://production.invalid';assert.equal(hostedReviewAllowed('review.example.vercel.app'),false);
 }finally{process.env=original;}
});

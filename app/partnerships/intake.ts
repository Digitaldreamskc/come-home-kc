'use server';
import { redirect } from 'next/navigation';
import { session } from '@/lib/supabase';
import { isolatedDatabase } from '@/lib/platform/preview-access';

const formId='14Zex_YOHYuTDtK5_f12bn9HCH_8EnHl2k158JvTnzg0';
type Item={title:string;questionItem?:{question:{questionId:string}}};
type Answer={textAnswers?:{answers:{value:string}[]}};
async function google(path:string,token:string){
 const response=await fetch('https://forms.googleapis.com/v1/forms/'+formId+path,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok) throw Error('Google Forms response access unavailable');return response.json();
}
export async function importIntake(){
 const {db,user}=await session();if(!user)redirect('/login');
 const {data:staff}=await db.rpc('user_is_admin');
 const token=process.env.NEW2KC_FORMS_READ_TOKEN;
 const id=process.env.NEW2KC_VALIDATION_RESPONSE_ID;
 if(!staff||!token||!id||process.env.NEXT_PUBLIC_SUPABASE_URL!==isolatedDatabase)redirect('/partnerships?status=intake-access');
 let ok=false;
 try{
  const form=await google('?fields=formId,items(title,questionItem(question(questionId)))',token);
  const response=await google('/responses/'+encodeURIComponent(id),token);
  const items=form.items as Item[];
  function answer(title:string){
   const key=items.find(i=>i.title===title)?.questionItem?.question.questionId;
   if(!key)throw Error('Source form changed');
   return ((response.answers[key] as Answer|undefined)?.textAnswers?.answers||[]).map(v=>v.value).join(', ');
  }
  const emailChoice=items.find(i=>i.title.startsWith('Stay Connected with New2KC'))?.title;
  if(response.responseId!==id||form.formId!==formId||!emailChoice)throw Error('Source mismatch');
  const {error}=await db.rpc('record_new2kc_source',{response_key:id,observed:response.lastSubmittedTime,
   need:answer('What would you like to do next?'),updates:answer(emailChoice),wording:emailChoice});
  ok=!error;
 }catch{/* Preserve the source and surface the configuration or access failure. */}
 redirect('/partnerships?status='+(ok?'saved':'intake-access'));
}

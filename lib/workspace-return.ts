import { headers } from 'next/headers';
/** Keep the active partnership and section after staff or partner updates. */
export async function workspaceReturn(status:string) {
 const ref=(await headers()).get('referer');
 const target=new URL('https://local.invalid/partnerships');
 if(ref){
  try{
   const previous=new URL(ref);
   if(previous.pathname==='/partnerships'){
    for(const key of ['view','agreement','q','stage']){
     const value=previous.searchParams.get(key);
     if(value)target.searchParams.set(key,value);
    }
   }
  }catch{/* Missing navigation context returns to the role-specific overview. */}
 }
 target.searchParams.set('status',status);
 return target.pathname+target.search;
}

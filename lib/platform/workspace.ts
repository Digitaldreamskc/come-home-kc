import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
export async function loadProgramWorkspace(db:SupabaseClient){
 const [program,paths]=await Promise.all([db.rpc('program_workspace'),db.rpc('path_workspace')]);
 if(program.error||paths.error)throw Error('Workspace unavailable');
 return {...program.data,connections:(paths.data.attempts as {id:string;state:string;role:string}[]).filter(a=>a.role==='requester').map(({id,state})=>({id,state}))};
}

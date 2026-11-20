import {notFound,redirect} from 'next/navigation';
import {openDemoReady} from '@/lib/open-demo-access';
import {civic,civicProgram} from '@/lib/platform/config';
import {loadProgramWorkspace} from '@/lib/platform/workspace';
import {civicSession} from '@/lib/platform/session';
import Program from '@/components/platform/program';
import Connections from '@/components/paths/persistent-workspace';
import '../../find-your-path/paths.css';
export const dynamic='force-dynamic';
export default async function CivicPage({params}:{params:Promise<{section?:string[]}>}){if(openDemoReady(process.env))notFound();const key=(await params).section?.join('/')||'home';if(!civicProgram.navigation.some(([k])=>k===key))notFound();if(key==='home')return <Program section="home" initial={null}/>;const {db,user}=await civicSession();if(!user)redirect('/civic/login');const r=await db.rpc('program_workspace');if(r.error)return <section><h1>Workspace unavailable</h1><p>This account does not have access to this civic workspace.</p></section>;if(key==='connections')return <Connections config={civic} apiBase="/api/civic/connections" accountHref="/civic/profile" homeHref="/civic" personSpecific embedded/>;return <Program section={key} initial={await loadProgramWorkspace(db)}/>;}

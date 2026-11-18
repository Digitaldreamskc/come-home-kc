import {randomUUID} from 'node:crypto';
import {createWorkspace,assertScope,type Workspace,type Actor} from './model';
type Session={workspace:Workspace;actor:Actor;expires:number};
const globalStore=globalThis as typeof globalThis & {pathDemoSessions?:Map<string,Session>};
const sessions=globalStore.pathDemoSessions??=new Map<string,Session>();
export function demoAllowed(host:string|null){return process.env.ENABLE_LOCAL_DEMO==='1'&&!process.env.VERCEL&&['localhost','127.0.0.1','[::1]'].includes((host||'').replace(/:\d+$/,''));}
export function createSession(tenantId:string,civic=false){for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id);if(sessions.size>=100)throw Error('Local review capacity reached. Try again later.');const token=randomUUID();const session={workspace:createWorkspace(randomUUID(),tenantId,new Date(),civic),actor:'requester' as Actor,expires:Date.now()+2*60*60*1000};sessions.set(token,session);return {token,session};}
export function getSession(token:string|undefined,tenantId:string){const session=token?sessions.get(token):undefined;if(!session||session.expires<Date.now())throw Error('Your local demonstration expired. Start a new workspace.');assertScope(session.workspace,tenantId,session.workspace.id);return session;}

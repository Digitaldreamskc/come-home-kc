export type Actor = 'requester' | 'jordan' | 'avery' | 'recipient' | 'admin';
export type State = 'team_declined' | 'changes_requested' | 'draft' | 'submitted' | 'connector_reviewing' | 'connector_declined' | 'connector_accepted' | 'recipient_reviewing' | 'recipient_declined' | 'recipient_accepted' | 'introduced' | 'replied' | 'completed' | 'expired' | 'cancelled';
export const actorNames: Record<Actor,string> = {requester:'Alex Morgan',jordan:'Jordan Ellis',avery:'Avery Chen',recipient:'Riley Brooks',admin:'Review team'};
export const stateLabels: Record<State,string> = {team_declined:'Declined by team',changes_requested:'Changes requested',draft:'Draft',submitted:'Submitted · awaiting team review',connector_reviewing:'Connector reviewing',connector_declined:'Connector declined',connector_accepted:'Connector accepted',recipient_reviewing:'Recipient reviewing',recipient_declined:'Recipient declined',recipient_accepted:'Recipient accepted',introduced:'Introduction made',replied:'Connection recorded',completed:'Completed',expired:'Expired',cancelled:'Cancelled'};
export type Edge = {id:string;tenantId:string;workspaceId:string;people:Actor[];type:string;context:string;source:string;confirmedBy:Actor[];permissions:Partial<Record<Actor,{visible:boolean;willing:boolean}>>;method:'mutual'|'admin_evidence';verifiedAt:string|null;reconfirmAt:string;visibility:boolean;willingness:boolean;revoked:boolean;evidenceRef:string};
export type Path = {id:string;tenantId:string;workspaceId:string;connector:'jordan'|'avery';role:string;edges:Edge[];paused:boolean;visible:boolean};
export type Event = {at:string;actor:Actor;state:State;description:string};
export type Request = {id:string;tenantId:string;workspaceId:string;pathId:string;state:State;note:string;shareContext:boolean;shareRequesterEmail:boolean;shareRecipientEmail:boolean;events:Event[];expiresAt:string;moreInformation?:string};
export type Workspace = {id:string;tenantId:string;createdAt:string;paths:Path[];requests:Request[];audit:{at:string;actor:Actor;description:string}[];linkedin:string;module:{title:string;destination:string;opportunity:string;reconfirmMonths:number}};
export type Action = {type:'draft';pathId:string;note:string;shareContext:boolean;shareEmail:boolean} | {type:'transition';requestId:string;to:State;consent?:boolean;shareEmail?:boolean;note?:string} | {type:'followup';requestId:string;connected:boolean;note:string} | {type:'pause';pathId:string;paused:boolean} | {type:'confirm';pathId:string;edgeId:string;visible:boolean;willing:boolean} | {type:'verify';pathId:string;edgeId:string;evidence:string} | {type:'revoke';pathId:string;edgeId:string} | {type:'information';requestId:string;note:string} | {type:'linkedin';url:string};
const terminal:State[]=['team_declined','changes_requested','connector_declined','recipient_declined','expired','cancelled','completed'];
export function createWorkspace(id:string,tenantId:string,now=new Date(),civic=false):Workspace {
 const at=now.toISOString(),renew=new Date(now);renew.setUTCFullYear(renew.getUTCFullYear()+1);
 const edge=(path:string,n:number,people:Actor[],context:string):Edge=>({id:path+'-'+n,tenantId,workspaceId:id,people,type:n===1?'Community collaboration':'Professional collaboration',context,source:'Confirmed by both participants · synthetic',confirmedBy:[...people],permissions:Object.fromEntries(people.map(a=>[a,{visible:true,willing:true}])),method:'mutual',verifiedAt:at,reconfirmAt:renew.toISOString(),visibility:true,willingness:true,revoked:false,evidenceRef:'Synthetic confirmation record'});
 const path=(key:string,connector:'jordan'|'avery',role:string):Path=>({id:key,tenantId,workspaceId:id,connector,role,paused:false,visible:true,edges:[edge(key,1,['requester',connector],connector==='jordan'?'You and Jordan confirmed volunteering together at a New2KC welcome event.':'You and Avery confirmed working together on a community mentoring project.'),edge(key,2,[connector,'recipient'],connector==='jordan'?'Jordan and Riley confirmed collaborating on a regional talent program.':'Avery and Riley confirmed collaborating on a professional mentoring program.')]});
 const paths=[path('jordan','jordan','Community connector · New2KC'),path('avery','avery','Talent partnerships and regional community programs lead'),path('paused','jordan','Community connector · paused route'),path('pending','avery','Community mentor · confirmation needed'),path('invalid','jordan','Previous professional collaboration')];
 paths[2].paused=true;paths[3].edges[0].confirmedBy=[];paths[3].edges[0].verifiedAt=null;paths[4].edges[0].revoked=true;
 return {id,tenantId,createdAt:at,paths,requests:[],audit:[],linkedin:'',module:{title:'Find your path',destination:civic?'Riley Brooks · Synthetic civic leadership program':'Riley Brooks · Example regional employer',opportunity:civic?'Community advisory cohort · Demonstration':'Community partnerships lead · Demonstration',reconfirmMonths:12}};
}
export function assertScope(w:Workspace,tenantId:string,workspaceId:string){if(w.tenantId!==tenantId||w.id!==workspaceId)throw Error('Workspace access denied.');}
function owned(w:Workspace,row:{tenantId:string;workspaceId:string}){assertScope(w,row.tenantId,row.workspaceId);}
export function verified(e:Edge,now=new Date()){return !e.revoked&&!!e.verifiedAt&&Date.parse(e.reconfirmAt)>now.getTime()&&(e.method==='admin_evidence'||e.people.every(a=>e.confirmedBy.includes(a)));}
export function availability(w:Workspace,p:Path,now=new Date()):string{
 owned(w,p);if(!p.visible||p.edges.some(e=>!e.visibility||e.revoked))return 'Unavailable';
 if(p.paused||p.edges.some(e=>!e.willingness))return 'Connector paused';
 if(p.edges.some(e=>!verified(e,now)))return 'Awaiting verification';
 if(w.requests.some(r=>r.pathId===p.id&&!terminal.includes(r.state)&&r.state!=='draft'))return 'Already requested';
 return 'Available';
}
function maySeeRequest(w:Workspace,r:Request,a:Actor){if(r.state==='draft')return a==='requester';if(a==='admin'||a==='requester')return true;const p=w.paths.find(p=>p.id===r.pathId)!;if(a===p.connector)return r.events.some(e=>e.state==='connector_reviewing');return a==='recipient'&&r.events.some(e=>e.state==='recipient_reviewing');}
export function expire(w:Workspace,now=new Date()){for(const r of w.requests)if(!terminal.includes(r.state)&&!['introduced','replied','draft'].includes(r.state)&&Date.parse(r.expiresAt)<=now.getTime()){r.state='expired';r.events.push({at:now.toISOString(),actor:'admin',state:'expired',description:'Request expired before introduction.'});}}
export function applyAction(w:Workspace,a:Actor,action:Action,now=new Date()){
 expire(w,now);const at=now.toISOString();const audit=(description:string)=>w.audit.push({at,actor:a,description});
 if(action.type==='linkedin'){if(a!=='requester')throw Error('Only your own optional profile link can be changed.');if(action.url&&!/^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%.-]+\/?$/.test(action.url))throw Error('Use a LinkedIn profile URL, or leave this blank.');w.linkedin=action.url;audit('Optional profile URL updated. No relationship inferred.');return;}
 if(action.type==='information'){const r=w.requests.find(r=>r.id===action.requestId);if(!r||!maySeeRequest(w,r,a)||!['connector_reviewing','recipient_reviewing'].includes(r.state)||!action.note.trim()||action.note.length>500)throw Error('A note is only available during participant review.');const p=w.paths.find(p=>p.id===r.pathId)!;if(a!=='requester'&&a!==(r.state==='connector_reviewing'?p.connector:'recipient'))throw Error('Only the current participants can add context.');r.events.push({at,actor:a,state:r.state,description:(a==='requester'?'Additional approved context: ':'More information requested: ')+action.note.trim()});audit('Review clarification recorded.');return;}
 if(action.type==='followup'){
  const r=w.requests.find(r=>r.id===action.requestId);if(!r||a!=='requester'||r.state!=='introduced')throw Error('Follow-up is only available to the requester after introduction.');owned(w,r);
  if(action.note.length>500)throw Error('Use no more than 500 characters.');
  if(action.connected)r.state='replied';
  r.events.push({at,actor:a,state:r.state,description:'Private follow-up: '+(action.connected?'Connected.':'Not yet connected.')+(action.note.trim()?' '+action.note.trim():'')});audit('Requester recorded a private follow-up.');return;
 }
 if(action.type==='transition'){
  const r=w.requests.find(r=>r.id===action.requestId);if(!r)throw Error('Request not available.');owned(w,r);if(!maySeeRequest(w,r,a))throw Error('Request access denied.');const p=w.paths.find(p=>p.id===r.pathId)!;
  const routes:Partial<Record<State,[State[],Actor]>>={team_declined:[['submitted','connector_accepted','recipient_accepted'],'admin'],changes_requested:[['submitted','connector_accepted','recipient_accepted'],'admin'],submitted:[['draft'],'requester'],connector_reviewing:[['submitted'],'admin'],connector_declined:[['connector_reviewing'],p.connector],connector_accepted:[['connector_reviewing'],p.connector],recipient_reviewing:[['connector_accepted'],'admin'],recipient_declined:[['recipient_reviewing'],'recipient'],recipient_accepted:[['recipient_reviewing'],'recipient'],introduced:[['recipient_accepted'],'admin'],replied:[['introduced'],'requester'],completed:[['replied'],'requester']};
  if(action.to==='cancelled'){if(a!=='requester'||terminal.includes(r.state)||['introduced','replied'].includes(r.state))throw Error('This request cannot be cancelled.');}
  else {const rule=routes[action.to];if(!rule||rule[1]!==a||!rule[0].includes(r.state))throw Error('This action is not permitted at this step.');}
  if(['submitted','connector_reviewing','connector_accepted','recipient_reviewing','recipient_accepted','introduced'].includes(action.to)){
   if(!p.visible||p.paused||p.edges.some(e=>!e.visibility||!e.willingness||!verified(e,now)))throw Error('This path needs confirmation or is no longer available. No introduction has been made.');
   if(!r.shareContext)throw Error('Choose whether to share the request context before submitting.');
  }
  if(['connector_accepted','recipient_accepted'].includes(action.to)&&action.consent!==true)throw Error('Explicit permission is required to continue.');
  if(action.to==='submitted'&&!r.note.trim())throw Error('Add a reason for connecting.');
  if(['introduced','changes_requested'].includes(action.to)&&!action.note?.trim())throw Error('Add a brief record of what happened.');
  if((action.note||'').length>500)throw Error('Use no more than 500 characters.');
  if(action.to==='recipient_accepted')r.shareRecipientEmail=action.shareEmail===true;
  r.state=action.to;r.events.push({at,actor:a,state:r.state,description:((action.to==='replied'||action.to==='completed')?'Private follow-up: ':'')+(action.note?.trim()||stateLabels[r.state])});audit('Request '+r.id+': '+r.state);return;
 }
 const p=w.paths.find(p=>p.id===action.pathId);if(!p)throw Error('Path not available.');owned(w,p);
 if(action.type==='draft'){
  if(a!=='requester'||availability(w,p,now)!=='Available')throw Error('This path is not available for a new request.');
  if(action.note.length>500)throw Error('Use no more than 500 characters.');
  let r=w.requests.find(r=>r.pathId===p.id&&r.state==='draft');if(!r){r={id:crypto.randomUUID(),tenantId:w.tenantId,workspaceId:w.id,pathId:p.id,state:'draft',note:'',shareContext:false,shareRequesterEmail:false,shareRecipientEmail:false,events:[],expiresAt:new Date(now.getTime()+14*86400000).toISOString()};w.requests.push(r);}
  r.note=action.note;r.shareContext=action.shareContext;r.shareRequesterEmail=action.shareEmail;audit('Private draft saved.');return;
 }
 if(action.type==='pause'){if(a!==p.connector)throw Error('Only the connector can change introduction availability.');p.paused=action.paused;audit('Connector '+(p.paused?'paused':'resumed')+' introductions.');return;}
 const edge=p.edges.find(e=>e.id===action.edgeId);if(!edge)throw Error('Relationship not available.');owned(w,edge);
 if(action.type==='revoke'){if(!edge.people.includes(a))throw Error('Only a participant may withdraw this relationship.');edge.revoked=true;edge.visibility=false;audit('Relationship permission withdrawn.');return;}
 if(action.type==='verify'){if(a!=='admin'||!action.evidence.trim()||action.evidence.length>500)throw Error('Authorized evidence review is required.');edge.method='admin_evidence';edge.evidenceRef=action.evidence;edge.verifiedAt=at;edge.source='Team-reviewed evidence · synthetic';}
 if(action.type==='confirm'){if(!edge.people.includes(a))throw Error('Only a relationship participant may confirm it.');if(Date.parse(edge.reconfirmAt)<=now.getTime()){edge.confirmedBy=[];edge.verifiedAt=null;}edge.confirmedBy=[...new Set([...edge.confirmedBy,a])];edge.permissions[a]={visible:action.visible,willing:action.willing};edge.visibility=edge.people.every(person=>edge.permissions[person]?.visible);edge.willingness=edge.people.every(person=>edge.permissions[person]?.willing);edge.method='mutual';if(edge.people.every(person=>edge.confirmedBy.includes(person)))edge.verifiedAt=at;}
 const next=new Date(now);next.setUTCMonth(next.getUTCMonth()+w.module.reconfirmMonths);edge.reconfirmAt=next.toISOString();audit('Relationship confirmation updated.');
}
export function project(w:Workspace,a:Actor,now=new Date()){
 expire(w,now);
 const paths=w.paths.filter(p=>p.visible&&p.edges.every(e=>e.visibility)&& (a==='admin'||a==='requester'||p.connector===a||a==='recipient')).map(p=>({id:p.id,connector:p.connector,name:actorNames[p.connector],role:p.role,status:availability(w,p,now),paused:p.paused,edges:p.edges.map(e=>({id:e.id,people:e.people,type:e.type,context:e.context,source:e.source,verified:verified(e,now),verifiedAt:e.verifiedAt,reconfirmAt:e.reconfirmAt,confirmedBy:e.confirmedBy,visibility:e.visibility,willingness:e.willingness,revoked:e.revoked,...(a==='admin'?{evidenceRef:e.evidenceRef}:{})}))}));
 const requests=w.requests.filter(r=>maySeeRequest(w,r,a)).map(r=>({id:r.id,pathId:r.pathId,state:r.state,note:r.note,shareContext:r.shareContext,shareRequesterEmail:r.shareRequesterEmail,shareRecipientEmail:r.shareRecipientEmail,events:r.events.map(e=>e.description.startsWith('Private follow-up:')&&!['requester','admin'].includes(a)?{...e,description:'Follow-up recorded privately with the team.'}:e),expiresAt:r.expiresAt,...(['introduced','replied','completed'].includes(r.state)?{requesterEmail:r.shareRequesterEmail&&['admin','recipient'].includes(a)?'alex@demo.example.test':null,recipientEmail:r.shareRecipientEmail&&['admin','requester'].includes(a)?'riley@demo.example.test':null}:{})}));
 const relationshipRecords=w.paths.flatMap(p=>p.edges.filter(e=>a==='admin'||e.people.includes(a)).map(e=>({pathId:p.id,name:actorNames[p.connector],connector:p.connector,paused:p.paused,edge:{id:e.id,people:e.people,type:e.type,context:e.context,source:e.source,verified:verified(e,now),verifiedAt:e.verifiedAt,reconfirmAt:e.reconfirmAt,confirmedBy:e.confirmedBy,visibility:e.visibility,willingness:e.willingness,revoked:e.revoked}})));
 return {relationshipRecords,actor:a,actorName:actorNames[a],tenantId:w.tenantId,module:w.module,paths,requests,...(a==='requester'?{linkedin:w.linkedin}:{}),...(a==='admin'?{audit:w.audit}:{} )};
}
export type View = ReturnType<typeof project>;

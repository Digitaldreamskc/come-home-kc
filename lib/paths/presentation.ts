import type {PersistentAttempt} from './persistent';
export const personName=(name:string)=>name.replace(/ · Synthetic$/u,'');
export function consentParticipant(a:PersistentAttempt,personId:string|null){
 if(!personId)return 'Participant removed';
 const identity=a.consents.find(c=>c.person_id===personId&&['request_context','connector_forward','recipient_accept'].includes(c.purpose));
 if(!identity)return 'Participant unavailable';
 return personName(identity.purpose==='request_context'?a.requester:identity.purpose==='connector_forward'?a.connector:a.recipient);
}
export function eventTitle(kind:string,a:PersistentAttempt){
 const requester=personName(a.requester),connector=personName(a.connector),recipient=personName(a.recipient);
 const titles:Record<string,string>={submitted:`${requester} — Request submitted`,connector_reviewing:'Review team — Route approved',connector_accepted:`${connector} — Accepted request`,connector_declined:`${connector} — Declined request`,recipient_reviewing:'Review team — Handoff approved',recipient_accepted:`${recipient} — Accepted introduction`,recipient_declined:`${recipient} — Declined introduction`,introduced:'Review team — Introduction made',changes_requested:'Review team — Changes requested',team_declined:'Review team — Request declined',cancelled:`${requester} — Request withdrawn`,expired:'System — Request expired',not_yet:`${requester} — Not yet connected`,connected:`${requester} — Connected`,completed:`${requester} — Completed`,clarification:'Additional context recorded'};
 return titles[kind]||kind.replaceAll('_',' ');
}
export function requestTimeline(a:PersistentAttempt){
 const stages=[['Request submitted','submitted'],['Team approved route','connector_reviewing'],[`${personName(a.connector)} agreed`,'connector_accepted'],['Team approved handoff','recipient_reviewing'],[`${personName(a.recipient)} accepted`,'recipient_accepted'],['Introduction made','introduced']];
 const result=stages.map(([title,kind])=>({title,kind,at:a.events.find(e=>e.kind===kind)?.at}));
 if(!a.invalidated_at)return result;
 const reasons:Record<string,string>={changes_requested:'Closed, changes requested',team_declined:'Closed, declined by team',connector_declined:'Closed, connector declined',recipient_declined:'Closed, recipient declined',cancelled:'Closed, withdrawn',expired:'Closed, expired',erased:'Closed, information removed'};
 return [...result.filter(s=>s.at),{title:reasons[a.state]||'Closed',kind:'closed',at:a.invalidated_at}];
}

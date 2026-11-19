export type RequestRecord=Record<string,unknown>;
const titles:Record<string,string>={employer:'Employer verification',candidate:'Talent interest',job:'Hiring need',resource:'Resource suggestion',partnership:'Partnership inquiry',mixer:'Mixer interest',deletion:'Information deletion',profile_change:'Information correction',introduction:'Introduction you requested'};
const statuses:Record<string,string>={pending:'Awaiting review',requested:'Awaiting review',reviewing:'Under review',approved:'Reviewed',rejected:'Feedback available',archived:'Archived',declined:'Not proceeding',closed:'Closed'};
export function requestTitle(kind:unknown){return titles[String(kind)]||'Your request';}
export function requestStatus(status:unknown){return statuses[String(status)]||'Under review';}
export function requestDate(value:unknown){const date=typeof value==='string'?new Date(value):null;return date&&Number.isFinite(date.getTime())?'Sent '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'America/Chicago'}).format(date):'Sent date unavailable';}

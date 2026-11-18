/** Server-side Gmail adapter. Never imported into client components. Disabled by default. */
export type StatusEmail={to:string;tenantName:string;status:'pending'|'approved'|'rejected'|'archived';portalUrl:string;eventId:string};
export type GmailConfig={enabled:boolean;from:string;clientId:string;clientSecret:string;refreshToken:string};
export function statusEmailMessage(input:StatusEmail,from:string){
 const email=/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i;
 if(!email.test(from)||!email.test(input.to)||/[\r\n]/.test(input.tenantName)||!input.tenantName.trim()||!/^[-a-zA-Z0-9]+$/.test(input.eventId))throw Error('Invalid notification envelope.');
 const url=new URL(input.portalUrl);if(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))throw Error('Invalid account link.');
 const labels={pending:'Awaiting review',approved:'Request reviewed',rejected:'Feedback available',archived:'Request archived'};
 const body=`${input.tenantName}: your employer verification request has changed.\n\nStatus: ${labels[input.status]}\n\nSign in to view the team’s feedback: ${url.href}\n\nHiring access is assigned separately after verification. No private candidate profiles are included in this message. This is a service update about your verification request, not a marketing subscription.`;
 const subject=Buffer.from(`${input.tenantName}: employer verification update`).toString('base64');
 return [`From: ${from}`,`To: ${input.to}`,`Subject: =?UTF-8?B?${subject}?=`,`Message-ID: <${input.eventId}@${from.split('@')[1]}>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Buffer.from(body).toString('base64')].join('\r\n');
}
export async function sendEmployerStatusEmail(input:StatusEmail,config:GmailConfig,fetcher:typeof fetch=fetch){
 if(!config.enabled)throw Error('Gmail delivery is disabled.');
 if(!config.clientId||!config.clientSecret||!config.refreshToken)throw Error('Gmail authorization is not configured.');
 const raw=Buffer.from(statusEmailMessage(input,config.from)).toString('base64url');
 const tokenResponse=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:config.refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
 if(!tokenResponse.ok)throw Error('Gmail authorization failed. No message was submitted.');
 const token=await tokenResponse.json();if(typeof token.access_token!=='string')throw Error('Gmail authorization failed. No message was submitted.');
 // Do not automatically retry an ambiguous send: reconcile the Message-ID first.
 const response=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Gmail did not confirm acceptance. Review this queue item before retrying.');
 const result=await response.json();if(typeof result.id!=='string')throw Error('Gmail acceptance is unconfirmed. Review this queue item before retrying.');
 return {status:'accepted' as const,providerMessageId:result.id};
}

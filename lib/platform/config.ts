import {tenantSchema} from '../tenant-config';
export const civic = tenantSchema.parse({id:'c3000000-0000-4000-8000-000000000001',key:'kcnow-concept',name:'KC Now',product:'KC Now · Civic Leadership',headline:'A more connected civic life starts with you.',description:'Learn how your community works. Meet people who care. Find a meaningful way to contribute.',communityName:'Civic community',communityUrl:'https://example.invalid',logo:null,geography:[{key:'all',label:'Across the region'},{key:'MO',label:'Missouri'},{key:'KS',label:'Kansas'}],tokens:{blue:'#22584C',gold:'#CDA56B',ink:'#173D34',paper:'#FFFEF9',soft:'#F0F2E9',muted:'#53645B',headingFont:'Georgia, serif',bodyFont:'Lato, Arial, sans-serif',radius:8,maxWidth:1280},modules:{talent:false,resources:true,employers:false,ai:false,connectors:false},freeCoreAccess:true,humanReviewedIntroductions:true,synthetic:true});
export const civicProgram = {
 stages:['Identify','Educate','Connect','Match','Activate','Measure'],
 audiences:['Civic leaders','Civic organizations','Education & community partners','Review team'],
 categories:['Nonprofit board','Public board or commission','Advisory committee','Leadership program','Elected leadership pathway'],
 interests:['Neighborhoods','Education','Public health','Arts & culture','Environment','Civic governance'],
 navigation:[['home','Home'],['profile','My Civic Profile'],['learning','Civic Learning'],['opportunities','Leadership Opportunities'],['connections','Find Your Path'],['journey','My Civic Journey'],['organization','Organization Workspace'],['review','Administrative Review']],
} as const;
export function previewMode(){return process.env.APP_MODE||'back2kc';}
export function modeAllows(mode:string,path:string,civicEnabled:boolean,showcaseEnabled:boolean){
 if(path.startsWith('/_next/')||path==='/favicon.ico')return true;
 if(mode==='back2kc')return !/^\/(civic|showcase|api\/civic)(\/|$)/.test(path);
 if(mode==='kcnow')return civicEnabled&&(path==='/'||/^\/(civic|api\/civic)(\/|$)/.test(path));
 if(mode==='showcase')return showcaseEnabled&&(path==='/'||/^\/showcase(\/|$)/.test(path));
 return false;
}

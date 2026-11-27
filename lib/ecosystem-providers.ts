import {publicDb} from './supabase';
export type EcosystemProvider={id:string;name:string;category:string;description:string;website:string;stage:string;industry:string;needs:string[];area:string;source:string;reviewed:string};
export async function ecosystemProviders():Promise<EcosystemProvider[]>{const {data,error}=await publicDb().from('ecosystem_providers').select('id,name,category,description,website,stage,industry,needs,area,source,reviewed').eq('status','published').order('name');if(error)throw Error('Ecosystem directory unavailable');return data||[];}

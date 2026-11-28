import {z} from 'zod';
import {allGroups,businessTypes,businessStages} from './ecosystem-application';
import {sectors} from './sector-taxonomy';
export const applicationCategories=['Business advising','Mentoring','Accelerators & growth programs','Commercialization & prototyping','Industry-specific support','Financing assistance','Workspace & facilities','Economic development','Other business support'] as const;
const short=z.string().trim().min(1).max(200);
const optional=z.string().trim().max(200).default('');
const url=z.string().trim().max(500).refine(v=>{try{return new URL(v).protocol==='https:';}catch{return false;}},'Use an HTTPS link');
const optionalURL=z.union([z.literal(''),url]).default('');
export const applicationSchema=z.object({
 name:short,programName:z.string().trim().max(150).default(''),category:z.enum(applicationCategories),website:url,facebook:optionalURL,x:optionalURL,linkedin:optionalURL,instagram:optionalURL,
 firstName:short,lastName:short,phone:z.string().trim().min(3).max(40),extension:z.string().trim().max(12).default(''),contactEmail:z.email().max(254),
 publicEmail:z.union([z.literal(''),z.email().max(254)]).default(''),publicPhone:z.string().trim().max(40).default(''),
 address1:short,address2:optional,city:short,state:z.string().trim().length(2).regex(/^[A-Z]{2}$/),zip:z.string().trim().min(3).max(20),
 quickDescription:z.string().trim().min(1).max(250),fullDescription:z.string().trim().max(5000).default(''),
 primaryType:z.enum(businessTypes as [string,...string[]]),primaryStage:z.enum(businessStages as [string,...string[]]),
 sectors:z.array(z.enum(sectors)).max(sectors.length),allIndustries:z.boolean(),sectorSpecialties:z.string().trim().max(1500).default(''),
 selections:z.record(z.string(),z.enum(['offer','specialty'])),geographicRestrictions:z.string().trim().min(1).max(1500),
 consent:z.literal(true),website_trap:z.literal('')
}).strict().superRefine((p,ctx)=>{
 for(const key of Object.keys(p.selections)){const [group,item,...rest]=key.split('|');if(rest.length||!Object.hasOwn(allGroups,group)||!allGroups[group].includes(item))ctx.addIssue({code:'custom',path:['selections'],message:'Unknown selection'});}
 for(const [group,item] of [['Business type',p.primaryType],['Business stage',p.primaryStage]])if(!p.selections[group+'|'+item])ctx.addIssue({code:'custom',path:['selections'],message:'Select the primary business type and stage in the service matrix.'});
});
export type ApplicationInput=z.input<typeof applicationSchema>;

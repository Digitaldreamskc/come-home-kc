import { regionKeys } from '@/lib/tenant-config';
import { sectors } from './sector-taxonomy';
import { z } from 'zod';
const t=z.string().max(15000),short=z.string().max(200),id=z.uuid(),date=z.string().max(40).nullable(),url=z.union([z.url().refine(v=>v.startsWith('https://')),z.literal(''),z.null()]);
const sectorList=z.array(z.enum(sectors)).max(sectors.length).optional();
export const adminSchemas={
ecosystem_providers:z.object({name:short.min(1),category:short.min(1),description:t.min(1),website:z.url().refine(v=>v.startsWith('https://')),stage:short,industry:short,sectors:sectorList,serves_all_industries:z.boolean().optional(),industry_specialties:t.optional(),needs:z.array(short).max(100),area:short,source:z.url().refine(v=>v.startsWith('https://')),reviewed:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),status:z.enum(['draft','published','archived'])}),
organizations:z.object({name:short.min(1),description:t,website:url,industry:short,sectors:sectorList,headquarters_state:z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region').nullable(),status:z.enum(['draft','published','archived']),verification_status:z.enum(['research','pending','verified']),source_url:url}),
organization_locations:z.object({organization_id:id,city:short.min(1),state:z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region'),source_url:url}),
organization_members:z.object({organization_id:id,user_id:id}),
employer_conversations:z.object({organization_id:id,contact:t,relationship_kind:short,status:short,notes:t,next_action:t,owner:short,due_date:date,source_url:url}),
job_needs:z.object({organization_id:id,title:short.min(1),details:t,status:z.enum(['open','paused','closed','archived'])}),
job_postings:z.object({organization_id:id,title:short.min(1),description:t,industry:short,work_mode:z.enum(['onsite','hybrid','remote']),employment_type:short,experience_level:short.optional(),salary_range:t.nullable(),application_url:url,application_instructions:t,status:z.enum(['pending','active','closed','archived']),expires_at:date,remote_eligible_states:z.array(z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region')).max(regionKeys.length-1)}),
job_locations:z.object({job_id:id,city:short.min(1),state:z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region'),source_url:url}),
resources:z.object({title:short.min(1),description:t,category:short,url:z.url().refine(v=>v.startsWith('https://')),contact_url:url,status:z.enum(['draft','published','archived']),source_url:url}),
resource_eligibility:z.object({resource_id:id,state:z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region'),notes:t}),
events:z.object({title:short.min(1),description:t,starts_at:z.string().min(10),location:t,state:z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region').nullable(),eligible_states:z.array(z.string().refine(v=>v!=='all'&&regionKeys.includes(v),'Choose an allowed region')),audience:t,registration_url:z.url().refine(v=>v.startsWith('https://')),capacity:z.number().int().positive().nullable(),host_organization_id:id.nullable(),status:z.enum(['draft','published','archived'])}),
tasks:z.object({action:t.min(1),owner:short,due_date:date,status:z.enum(['Open','Done','Cancelled']),notes:t}),
introductions:z.object({request_id:id.nullable(),candidate_user_id:id,organization_id:id,rationale:t,sharing_scope:t,candidate_approved_at:date,employer_approved_at:date,permission_evidence:t,introduced_at:date,status:z.enum(['proposed','approved','introduced','meeting','closed']),next_action:t}),
outcomes:z.object({introduction_id:id.nullable(),type:short.min(1),occurred_on:date,verification:z.enum(['Reported','Confirmed']),source:t,details:t,public_approved:z.boolean()})};
export const adminTables=[...Object.keys(adminSchemas),'candidate_profiles','introduction_requests','submissions','import_batches','import_records','audit_history','communications_consent'];

import { z } from 'zod';
import back2kc from '../tenants/back2kc.json';
import synthetic from '../tenants/synthetic.json';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const tenantSchema = z.object({
  id: z.uuid(), key: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), product: z.string().min(1),
  headline: z.string(), description: z.string(), communityName: z.string(), communityUrl: z.url(),
  logo: z.string().regex(/^\/[a-zA-Z0-9/_.-]+$/).nullable(),
  geography: z.array(z.object({key:z.string().regex(/^[a-zA-Z0-9-]+$/),label:z.string().min(1)})).min(2),
  tokens: z.object({blue:color,gold:color,ink:color,paper:color,soft:color,muted:color,headingFont:z.string(),bodyFont:z.string(),radius:z.number().min(0).max(32),maxWidth:z.number().min(960).max(1600)}),
  modules: z.object({talent:z.boolean(),resources:z.boolean(),employers:z.boolean(),ai:z.literal(false),connectors:z.literal(false)}),
  // Talent profiles and public browsing stay free. This is not a promise that employer partnership is free.
  freeCoreAccess:z.literal(true), humanReviewedIntroductions:z.literal(true), synthetic:z.boolean()
}).strict().refine(v=>v.geography[0].key==='all'&&new Set(v.geography.map(r=>r.key)).size===v.geography.length,'Unique geography with all first is required');
export type TenantConfig = z.infer<typeof tenantSchema>;
export const tenants = {back2kc:tenantSchema.parse(back2kc),synthetic:tenantSchema.parse(synthetic)};
export function getTenant(key: string = 'back2kc'): TenantConfig {
  if (!Object.hasOwn(tenants,key)) throw new Error('Unknown tenant configuration');
  return tenants[key as keyof typeof tenants];
}
// Deployment-controlled selection, never a request header or query-string selector.
export const tenant = getTenant(process.env.NEXT_PUBLIC_TENANT_KEY || 'back2kc');
export const regionKeys = tenant.geography.map(r=>r.key);
export function designTokens(config:TenantConfig):Record<string,string>{
  const t=config.tokens;
  return {'--blue':t.blue,'--gold':t.gold,'--ink':t.ink,'--paper':t.paper,'--soft':t.soft,'--muted':t.muted,'--heading-font':t.headingFont,'--body-font':t.bodyFont,'--radius':`${t.radius}px`,'--content-width':`${t.maxWidth}px`};
}

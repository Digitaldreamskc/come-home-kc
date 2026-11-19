/** This mode has no database credentials or server-side mutations. */
export function openDemoReady(env:Record<string,string|undefined>){return env.APP_MODE==='open-demo'&&env.ENABLE_OPEN_SYNTHETIC_DEMO==='1'&&!Object.entries(env).some(([k,v])=>k.includes('SUPABASE')&&!!v)&&env.GMAIL_DELIVERY_ENABLED==='false';}
export function openDemoPath(path:string){return path==='/'||path==='/demo'||path.startsWith('/demo/')||path.startsWith('/brand/')||path.startsWith('/_next/')||path==='/favicon.ico';}


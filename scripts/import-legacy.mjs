import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [file, mode='--dry-run', reportFile='migration-report.json'] = process.argv.slice(2);
if (!file || !['--dry-run','--apply'].includes(mode)) throw Error('Usage: node scripts/import-legacy.mjs <authorized-backup.json> [--dry-run|--apply] [report.json]');
const raw=await readFile(file,'utf8'); const data=JSON.parse(raw);
const collections=['employers','candidates','demands','matches','outcomes','tasks'];
if(data.schema_version!=='1.0.0'||data.program_id!=='back2kc-come-home')throw Error('Unsupported backup');
const report={mode,source_sha256:createHash('sha256').update(raw).digest('hex'),counts:{},original_records:0,duplicates:[],requires_review:[],missing_information:[]};
for(const c of collections){if(!Array.isArray(data[c]))throw Error(`Missing collection ${c}`);const ids=new Set();report.counts[c]=data[c].length;report.original_records+=data[c].length;
 for(const r of data[c]){if(!r||typeof r!=='object'||!r.id)throw Error(`Missing ID in ${c}`);if(ids.has(r.id))report.duplicates.push(`${c}:${r.id}`);ids.add(r.id);if(!['employers','tasks'].includes(c))report.requires_review.push(`${c}:${r.id}`);if(c==='employers'&&(!r.hiring_contact||!r.location))report.missing_information.push(`${c}:${r.id}: verified hiring contact/location`);}}
if(report.duplicates.length)throw Error('Duplicate IDs; source unchanged. Resolve before import.');
if(mode==='--apply'){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Isolated Supabase URL and server-only service key required');
 if(process.env.CONFIRM_ISOLATED_DATABASE!=='yes')throw Error('Set CONFIRM_ISOLATED_DATABASE=yes after checking the target project.');
 const res=await fetch(`${url}/rest/v1/rpc/import_legacy`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({source_data:data,source_name:file.split('/').pop()})});
 if(!res.ok)throw Error(`Import failed (${res.status}): ${await res.text()}`);report.database_result=await res.json();
}
await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:reportFile,mode,counts:report.counts,original_records:report.original_records,...(report.database_result||{})},null,2));

/** Produces a source-only upload manifest. Never exports local/private data. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const excluded=new Set(['node_modules','.next','.git','.vercel','legacy','test-results','playwright-report']);
const excludedFiles=new Set(['.test-accounts.json','.DS_Store']);
const files=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory()){if(!excluded.has(item.name))walk(full);continue;}if(!item.isFile()||excludedFiles.has(item.name))continue;const relative=path.relative(root,full).split(path.sep).join('/');if(item.name.startsWith('.env')&&item.name!=='.env.example')continue;if(item.name.endsWith('.tsbuildinfo')||/raw.*\.json$/i.test(item.name))continue;const bytes=fs.readFileSync(full);if(bytes.includes(0))throw Error(`Binary source needs separate review: ${relative}`);const content=bytes.toString('utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{16,}|SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#<]/.test(content))throw Error(`Potential secret in ${relative}`);files.push({path:relative,mode:'100644',type:'blob',content});}}
walk(root);process.stdout.write(JSON.stringify(files));

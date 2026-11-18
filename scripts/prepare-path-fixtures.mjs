// Generates reviewable SQL only. Never connects to a database or prints credentials.
import fs from 'node:fs';
import path from 'node:path';
const env=fs.readFileSync('.env.local','utf8');
if(!/^NEXT_PUBLIC_SUPABASE_URL=['"]?https:\/\/kxuvmilbvwwcrxiqnftx\.supabase\.co['"]?\s*$/m.test(env))throw Error('The authorized isolated project must be configured.');
const accounts=JSON.parse(fs.readFileSync('.test-accounts.json','utf8'));
for(const role of ['candidate','employer','other','admin'])if(!/^[a-f0-9-]{36}$/i.test(accounts[role]?.id||''))throw Error('Synthetic fixture ID required.');
const tenant='b2000000-0000-4000-8000-000000000001';
const people=['candidate','employer','other'].map((role,i)=>`('${tenant}','f7000000-0000-4000-8000-00000000000${i+1}','${accounts[role].id}','${['Alex Morgan','Jordan Ellis','Riley Brooks'][i]} · Synthetic')`).join(',\n');
const sql=`-- ONLY come-home-kc-m1-validation. Existing synthetic Auth users must exist.
begin;
update private.relationship_modules set enabled=true,title='Find your path' where tenant_id='${tenant}';
insert into private.path_people(tenant_id,id,user_id,display_name) values ${people} on conflict(tenant_id,id) do nothing;
insert into private.workflow_reviewers(tenant_id,user_id,workflow) select '${tenant}','${accounts.admin.id}',w from unnest(array['introductions','privacy','profiles'])w on conflict do nothing;
insert into private.path_relationships(tenant_id,id,person_a,person_b,context) values
('${tenant}','f8000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002','Synthetic example: volunteered together at a community welcome event.'),
('${tenant}','f8000000-0000-4000-8000-000000000002','f7000000-0000-4000-8000-000000000003','f7000000-0000-4000-8000-000000000002','Synthetic example: collaborated on a regional talent program.') on conflict(tenant_id,id) do nothing;
commit;
-- No relationship confirmation or individual consent is seeded. Participants make those choices.
`;
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/phase2-fixtures.sql',sql);console.log('Prepared '+path.resolve('work/phase2-fixtures.sql')+'; no database was changed.');

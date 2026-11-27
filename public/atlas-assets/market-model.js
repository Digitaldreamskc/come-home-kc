export const quarterOf = date => /^\d{4}-\d{2}-\d{2}$/.test(date||'') ? `${date.slice(0,4)} Q${Math.ceil(Number(date.slice(5,7))/3)}` : null;
export function eligibleRounds(rounds) {return rounds.filter(r=>r.status==='closed' && r.kind==='venture');}
export function summarize(rounds) {
 const eligible=eligibleRounds(rounds), disclosed=eligible.filter(r=>Number.isFinite(r.amount)&&r.amount>=0);
 return {count:eligible.length, disclosedCount:disclosed.length, undisclosedCount:eligible.length-disclosed.length, amount:disclosed.length?disclosed.reduce((s,r)=>s+r.amount,0):null};
}
export function quarterWindow(asOf,n=8) {
 const year=+asOf.slice(0,4), q=Math.floor((+asOf.slice(5,7)-1)/3), end=year*4+q;
 return Array.from({length:n},(_,i)=>{const x=end-n+1+i;return {label:`${Math.floor(x/4)} Q${x%4+1}`, incomplete:x===end};});
}
export function comparable(a,b) {return ['period','geographyMethod','currency','fundingMethod','coverage'].every(k=>a[k] && a[k]===b[k]) && a.coverage==='complete';}

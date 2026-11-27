// Sector labels supplied in the CapitalAtlas.ai reference screenshots.
export const sectors=['Artificial Intelligence','Business Services','Consumer Discretionary','Developer Tools','Diversified','Energy & Utilities','Financial & Insurance Services','FinTech','Healthcare','Industrials','Information Technology','Infrastructure','Machine Learning','Raw Materials & Natural Resources','Real Estate','SaaS','Telecoms & Media'] as const;
export function matchesSectors(documented:string,selected:readonly string[],generalSupport=false):boolean{
 if(!selected.length)return true;
 if(generalSupport&&documented==='All industries')return true;
 // Broad legacy categories are discovery mappings, not new claims of specialization.
 const normalized=documented==='Technology'?'Information Technology':documented==='Life sciences'?'Healthcare':documented;
 return selected.includes(normalized);
}

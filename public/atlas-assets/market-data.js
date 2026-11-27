// Public announcement snapshot, not a Dealroom export or a market census.
export const marketSnapshot = {
  reviewed: '2026-11-20', start: '2025-01-01', end: '2026-11-20', currency: 'USD',
  geography: 'Selected Kansas City-area companies (Missouri and Kansas)',
  coverage: 'selected_announcements',
  dealroomURL: 'https://dealroom.co/cities/kansas-city/',
  termsURL: 'https://dealroom.co/terms-and-conditions',
  rounds: [
    {id:'benefitbay-2026-a', company:'benefitbay', amount:18000000, stage:'Series A', date:'2026-05-21', dateBasis:'Company announcement', location:'Kansas City, Missouri', status:'closed', kind:'venture', source:'Company release · EIN Presswire', url:'https://www.einpresswire.com/article/914114134/benefitbay-raises-18-million-series-a-led-by-ten-coves-capital-to-scale-its-broker-first-ichra-platform', note:'Company announced a closed Series A led by Ten Coves Capital. This is the round amount, not cumulative funding.'},
    {id:'carepilot-2025-seed', company:'CarePilot', amount:2500000, stage:'Seed', date:'2025-06-18', dateBasis:'Reported by this date; exact announcement day not established', location:'Overland Park, Kansas', status:'closed', kind:'venture', source:'Kansas City Business Journal', url:'https://www.bizjournals.com/kansascity/news/2025/06/18/carepilot-closes-million-dollar-seed-round-tutera.html', corroboration:'https://startlandnews.com/2025/06/carepilot-joseph-tutera-funding/', note:'Reported closed seed round led by Mucker Capital, with KCRise Fund participating. Open coverage on June 24 corroborates the amount and stage.'},
    {id:'daupler-2025-b', company:'Daupler', amount:15000000, stage:'Series B', date:'2025-03-06', dateBasis:'Company announcement', location:'Kansas City, Kansas (release dateline)', status:'closed', kind:'venture', source:'Company release · PR Newswire', url:'https://www.prnewswire.com/news-releases/daupler-raises-15-million-series-b-to-help-utilities-automate-real-time-incident-response-management-302394707.html', note:'Company announced a closed Series B led by Aqualateral, with Burnt Island Ventures and KCRise Fund participating.'}
  ]
};

// Limited attributed metro facts from the 2026 NVCA public data pack, p27.
export const peerSnapshot = {
  reviewed:'2026-11-20', release:'2026-04', asOf:'2025-12-31', currency:'USD',
  source:'NVCA 2026 Yearbook · PitchBook',
  url:'https://nvca.org/wp-content/uploads/2026/04/2026-YB-Public-PDF.pdf#page=27',
  methodologyURL:'https://nvca.org/wp-content/uploads/2026/04/NVCA-2026-Yearbook-4.9.26.pdf#page=86',
  geographyMethod:'Provider-defined Metropolitan Statistical Areas; boundary vintage not established',
  disclosureRule:'Reported VC deal value; treatment of undisclosed/estimated amounts not established from the metro table',
  coverage:'provider_reported',
  metros:[
    {name:'Kansas City', area:'Kansas City, MO–KS MSA', years:{2024:{valueMillions:210.50,deals:48},2025:{valueMillions:483.23,deals:44}}},
    {name:'St. Louis', area:'St. Louis, MO–IL MSA', years:{2024:{valueMillions:316.12,deals:51},2025:{valueMillions:584.16,deals:61}}},
    {name:'Omaha', area:'Omaha–Council Bluffs, NE–IA MSA', years:{2024:{valueMillions:42.77,deals:30},2025:{valueMillions:56.95,deals:33}}},
    {name:'Des Moines', area:'Des Moines–West Des Moines, IA MSA', years:{2024:{valueMillions:68.84,deals:15},2025:{valueMillions:59.20,deals:11}}}
  ]
};

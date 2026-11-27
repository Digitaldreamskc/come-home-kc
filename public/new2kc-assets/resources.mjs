// Curated resource collection supplied by Mary in the shared Link Resource Guide.
// Keep outbound destinations aligned with validation/source-links.json.
export const PATHS = {
  people: {
    name: 'Meet people', kicker: 'PEOPLE MAKE A PLACE',
    heading: 'Find a reason to show up.',
    description: 'Start with a local gathering, a shared interest, or a cause you care about. Overland Park and Johnson County come first, with a few ways to connect across the metro.',
    filters: ['All', 'Community gatherings', 'Shared interests', 'Giving back']
  },
  career: {
    name: 'Find a career', kicker: 'MAKE ROOM FOR POSSIBILITY',
    heading: 'Find your way into the work.',
    description: 'Explore working in Overland Park, meet local business professionals, or find support for a business of your own. Follow the original sources for opportunities and requirements.',
    filters: ['All', 'Career resources', 'Professional networks', 'Business support']
  },
  places: {
    name: 'Explore neighborhoods', kicker: 'GET A FEEL FOR EVERYDAY LIFE',
    heading: 'Get to know the places. Find your fit.',
    description: 'Use local guides to explore Overland Park and Johnson County, then get to know the wider KC metro through culture, history, and everyday connections. Start with the source, then plan a visit.',
    filters: ['All', 'Local guides', 'Culture & history', 'Getting around']
  }
};

export const RESOURCES = [
  {
    id: 'downtown-events', path: 'people', category: 'Community gatherings',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'Downtown Overland Park',
    title: 'Downtown Overland Park events',
    description: 'Get familiar with downtown through its community calendar and local gatherings.',
    step: 'Choose an event that interests you. Check its current location and details, then plan time to explore nearby.',
    url: 'https://www.downtownop.org/events', link: 'Browse downtown events'
  },
  {
    id: 'op-farmers-market', path: 'people', category: 'Community gatherings',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'City of Overland Park',
    title: 'Overland Park Farmers Market',
    description: 'Make a local food stop part of getting to know the community.',
    step: 'Check the city’s market information before visiting. Pick a vendor to talk with and something local to try.',
    url: 'https://www.opkansas.gov/farmers-market', link: 'Plan a market visit'
  },
  {
    id: 'lenexa-market', path: 'people', category: 'Community gatherings',
    label: 'LENEXA · JOHNSON COUNTY, KS', source: 'Lenexa Public Market',
    title: 'Lenexa Public Market',
    description: 'Explore food vendors and recurring activities, from family programming to seasonal live music.',
    step: 'Find a current activity that fits your interests. Check dates and details, then invite someone to meet you there.',
    url: 'https://www.lenexapublicmarket.com/Events/Weekly-Events', link: 'See weekly activities'
  },
  {
    id: 'joco-library', path: 'people', category: 'Community gatherings',
    label: 'JOHNSON COUNTY, KS', source: 'Johnson County Library',
    title: 'Johnson County Library events',
    description: 'Find an everyday connection to learning and local life through the library’s events calendar.',
    step: 'Browse by location or interest. Check whether the event you choose needs registration.',
    url: 'https://jocolibrary.bibliocommons.com/v2/events', link: 'Find a library event',
    relatedUrl: 'https://www.jocolibrary.org/', relatedLink: 'Explore library resources'
  },
  {
    id: 'joco-parks', path: 'people', category: 'Shared interests',
    label: 'JOHNSON COUNTY, KS', source: 'Johnson County Park & Recreation District',
    title: 'Parks, recreation & shared interests',
    description: 'Find parks, activities, recreation programs, and special events through JCPRD.',
    step: 'Pick an activity you would enjoy returning to. Check the location, schedule, registration, and fees at the source.',
    url: 'https://www.jcprd.com/', link: 'Explore JCPRD'
  },
  {
    id: 'joco-arts', path: 'people', category: 'Shared interests',
    label: 'JOHNSON COUNTY, KS', source: 'Arts Council of Johnson County',
    title: 'Find your local arts calendar',
    description: 'Discover exhibitions, performances, and cultural activities around the county.',
    step: 'Choose one exhibition or performance to explore. Follow the listing to confirm the venue and current details.',
    url: 'https://artsjoco.org/acjc/calendar-of-events/', link: 'Browse arts & culture'
  },
  {
    id: 'kc-crew', path: 'people', category: 'Shared interests',
    label: 'KC METRO · LOCATIONS VARY', source: 'KC Crew',
    title: 'Join a league without a team',
    description: 'KC Crew offers individual signup options for people who want to meet others through adult sports.',
    step: 'Compare a sport, location, and time commitment that work for you. Review the current availability and cost.',
    url: 'https://kccrew.com/individualsignup/', link: 'Explore individual signup'
  },
  {
    id: 'volunteer', path: 'people', category: 'Giving back',
    label: 'KC METRO · LOCATIONS VARY', source: 'Uncover KC',
    title: 'Connect through a cause',
    description: 'Find volunteer opportunities, a nonprofit directory, and ways to contribute through Uncover KC.',
    step: 'Choose a cause that matters to you. Look for an opportunity that fits your location, skills, and availability.',
    url: 'https://uncoverkc.org/get-involved', link: 'Find ways to get involved'
  },
  {
    id: 'all-in-op', path: 'career', alsoPath: 'places', category: 'Career resources', alsoCategory: 'Local guides',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'All in Overland Park',
    title: 'All in Overland Park',
    description: 'A starting point for living, working, learning, and exploring OP, with neighborhood information and a community map.',
    step: 'Explore the work resources or community map. Note one opportunity or area you would like to learn more about.',
    url: 'https://allinoverlandpark.com/', link: 'Explore living & working in OP'
  },
  {
    id: 'op-chamber', path: 'career', category: 'Professional networks',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'Overland Park Chamber of Commerce',
    title: 'Meet the local business community',
    description: 'Explore Chamber events for professional connections and a closer look at the community.',
    step: 'Find an event relevant to your work. Check registration, attendance requirements, and any cost before making plans.',
    url: 'https://www.opchamber.org/events/', link: 'Browse Chamber events'
  },
  {
    id: 'op-young-professionals', path: 'career', category: 'Professional networks',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'Overland Park Chamber of Commerce',
    title: 'Overland Park Young Professionals',
    description: 'Explore professional, social, and philanthropic opportunities for emerging business and civic leaders.',
    step: 'Read about the group and its events. Decide whether this community fits the connections you want to build.',
    url: 'https://www.opchamber.org/young-professionals/', link: 'Get to know OP Young Professionals'
  },
  {
    id: 'ecjc', path: 'career', category: 'Business support',
    label: 'JOHNSON COUNTY, KS · REGIONAL RESOURCES', source: 'Enterprise Center in Johnson County',
    title: 'Support for a business you’re building',
    description: 'Explore entrepreneur education, mentoring, and capital resources through ECJC.',
    step: 'Identify your most immediate business question. Review the programs to find a relevant starting point.',
    url: 'https://www.ecjc.com/', link: 'Explore ECJC resources'
  },
  {
    id: 'kc-sourcelink', path: 'career', category: 'Business support',
    label: 'KC METRO · REGIONAL RESOURCES', source: 'KCSourceLink',
    title: 'Find your way into business resources',
    description: 'Navigate entrepreneurial resources, funding guidance, and business events across the KC region.',
    step: 'Start with a guide or resource search that matches your business stage. Bring one specific question.',
    url: 'https://www.kcsourcelink.com/', link: 'Explore KCSourceLink'
  },
  {
    id: 'visit-op', path: 'places', category: 'Local guides',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'Visit Overland Park',
    title: 'Get to know Overland Park',
    description: 'Explore restaurants, attractions, events, outdoor activities, and things to try as you get settled.',
    step: 'Build a first visit around one place to eat and one activity. Notice what you might want in your everyday routine.',
    url: 'https://www.visitoverlandpark.com/', link: 'Explore Visit Overland Park'
  },
  {
    id: 'arts-heritage', path: 'places', category: 'Culture & history',
    label: 'OVERLAND PARK · JOHNSON COUNTY, KS', source: 'Johnson County Kansas',
    title: 'Arts & Heritage Center',
    description: 'Get to know local history, the Johnson County Museum, children’s experiences, and arts programming.',
    step: 'Choose an exhibition or activity that interests you. Check the current hours, admission, and program details.',
    url: 'https://www.jocogov.org/contact-us/all-locations/arts-and-heritage-center', link: 'Explore the Arts & Heritage Center'
  },
  {
    id: 'ride-joco', path: 'places', category: 'Getting around',
    label: 'JOHNSON COUNTY, KS', source: 'Johnson County Transit / RideJoCo',
    title: 'Get around Johnson County',
    description: 'Explore local transportation information, including bus and on-demand microtransit services.',
    step: 'Check whether a route or service covers your actual destinations. Confirm service hours, requirements, and fares.',
    url: 'https://www.jocogov.org/department/ridejoco-johnson-county-transit', link: 'Explore RideJoCo'
  },
  {
    id: 'visit-kc', path: 'places', category: 'Local guides',
    label: 'KC METRO · BOTH SIDES OF THE STATE LINE', source: 'Visit KC',
    title: 'Explore the wider KC metro',
    description: 'Use a regional guide to discover neighborhoods, attractions, food, and events beyond your first stop.',
    step: 'Choose one area you haven’t explored. Plan a visit and compare the everyday connections that matter to you.',
    url: 'https://www.visitkc.com/', link: 'Explore Visit KC'
  },
  {
    id: 'global-cultures', path: 'places', category: 'Culture & history',
    label: 'KC METRO · INCLUDES LENEXA, KS', source: 'Visit KC',
    title: 'Explore KC’s Global Cultures',
    description: 'Get to know your new city through the food, traditions, and communities that help shape its neighborhoods.',
    step: 'Read the original guide, choose one destination, and invite someone to explore it with you.',
    url: 'https://www.visitkc.com/articles/encounter-global-cultures-in-these-kansas-city-neighborhoods/', link: 'Read the guide'
  },
  {
    id: 'ride-kc', path: 'places', category: 'Getting around',
    label: 'KC METRO · REGIONAL CONNECTIONS', source: 'RideKC',
    title: 'Connect your plans across the metro',
    description: 'Explore regional trip planning, routes, service alerts, and transportation connections.',
    step: 'Test a trip between two places you would actually use. Check current routes, service alerts, travel times, and fares.',
    url: 'https://ridekc.org/', link: 'Plan with RideKC'
  }
];

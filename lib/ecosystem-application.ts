// Functional intake taxonomy adapted from KCSourceLink's resource partner application.
// Labels are independently phrased; a specialty also means the service is offered.
export const businessTypes=['Innovation-led','Main Street','Microenterprise','Second stage'];
export const businessStages=['Idea / inception','Proof of concept / prototype / market introduction','Rollout','Growth / expansion'];
export const industries=['Agriculture','Arts','Bioscience services and manufacturing','Construction','Education','Energy and utilities','Finance and insurance','Health and childcare','High-tech services and manufacturing','Information technology','Management','Manufacturing','Mining','Nonprofit','Other services','Personal services','Professional services','Real estate','Restaurants and hospitality','Retail','Tourism','Transportation and warehousing','Wholesale'];
export const serviceGroups:Record<string,string[]>={
 'Business planning':['Business plan consulting and review','Feasibility analysis','Business formation','Foreign market research','Marketing plan development','Market research','Demographic and census information'],
 'Business acquisitions and sales':['Franchise purchases or sales','Existing business acquisitions','Business valuation'],
 'Economic and site development':['Economic forecasts','Environmental compliance','Lease review','Revitalization','Site selection','Tax credits','Watershed planning'],
 'Finance and funding':['Angel investment','Bookkeeping and accounting software training','Budgeting and cash-flow training','International trade show funding','Insurance requirements','Lending','Debt financing assistance','Equity financing assistance','Government funding assistance','Real estate finance','Tax credits','Technology grants','Venture capital'],
 'Human resources':['Hiring, employee development and policies','Retention','Workforce incentives'],
 'Importing and exporting':['Export financing assistance','Foreign market research','Import/export licenses and certification','Foreign distributors','Export networking','Trade training'],
 'Student and internship services':['Internships','Student marketing projects','Student research projects','Youth entrepreneurship education'],
 'Legal assistance':['Contract review','Environmental compliance','Business formation','Lease review','Patent workshops','Patent, trademark and copyright information'],
 'Libraries and research':['Business research','Demographic and census information'],
 'Management':['Human resources','Insurance requirements','Leadership and professional development','Recruiting'],
 'Manufacturing, technology and life sciences':['Commercialization','Hazardous waste reduction training','Health and safety training','High-tech development','Industrial technology research','Life sciences development','Manufacturing development','Pollution prevention','Quality and supply-chain improvement','Science and bioscience seminars','Technology transfer','Wet lab incubation'],
 'Marketing and sales':['Advertising and brochure design','Awards and recognition','Call center services','Competitive analysis','Demographic and census information','E-commerce and digital marketing','Feasibility analysis','Foreign market research','Marketing plan development and training','Market research','Student marketing projects','Website development'],
 'Mentoring':['Formal mentoring','Individual counseling','Peer mentoring'],
 'Networking':['Demographic-based networks','Geographic networks','Home-based businesses','Industry networks','International trade networks','General small business networks'],
 'Nonprofit development':['Accounting','Board development','Fundraising','Human resources','Organizational audits','Strategic planning','Technical services'],
 'Space and facilities':['Accelerator','Commercial kitchens','Meeting and event space','Coworking','Incubator space','Lease review','Makerspace','Office equipment and furniture','Office space','Retail space','Site selection','Wet lab incubation'],
 'Operations and logistics':['Freight and distribution','Hazardous waste reduction training','Health and safety training','Freight forwarders and customs brokers','Pollution prevention','Quality and supply-chain improvement'],
 'Product development':['Patent information','Assembly and packaging','Product design and development','Prototyping'],
 'Public policy and government relations':['Black-owned business issues','City-specific business issues','Hispanic business issues','Kansas business issues','LGBTQ+ business issues','Missouri business issues','Native American business issues','Small business policy','Women-owned business issues'],
 'Regulatory compliance':['Bonding','Codes','Environmental compliance','Government requirements','Insurance requirements','International compliance','Patent information','Registration, licenses and permits','Trademark and copyright information'],
 'Government and corporate sales':['Bid matching and preparation','Government and military specifications','HUBZone certification','Certification assistance','Corporate contracting','Government contracting','Price history','Registration assistance','Sales to foreign governments and businesses','Subcontracting'],
 'Starting a business':['Business research','Feasibility analysis','Business formation','Home-based business training','Registration, licenses and permits','Site selection','Startup counseling','Startup classes'],
 'Taxes':['State and federal tax training','State tax credit information','Tax credits','Tax preparation assistance','Tax registration'],
 'Technical assistance':['Bookkeeping and accounting software training','Commercialization','Industrial technology research','Pollution prevention','Technology transfer','Website development'],
 'Training':['Bookkeeping and accounting software training','Budgeting and cash-flow training','Business management training','Business planning training','E-commerce and digital marketing','Hazardous waste reduction training','Health and safety training','Home-based business training','Human resources training','International trade training','Marketing plan training','Startup classes','Trade education']
};
export const demographicGroups:Record<string,string[]>={'Business type':businessTypes,'Business stage':businessStages,'Industry':industries};
export const allGroups={...demographicGroups,...serviceGroups};

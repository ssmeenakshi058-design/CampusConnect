import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db, sanitizeId } from './firebase';
import {
  CAMPUS_ASSETS,
  type DemoSeedMetadata,
  type EventMode,
  type EventType,
  type WorkMode,
} from '../types/campus';

export const CURRENT_DEMO_SEED_VERSION = 'v2026.11.demo.1050';
const SAFE_BATCH_SIZE = 350; // Strictly under 400 ops/batch

export interface DemoGenerationProgress {
  phase: string;
  completedOps: number;
  totalOps: number;
  insertedRecords: number;
  errors: string[];
}

export interface DemoDatasetStats {
  companiesCount: number;
  internshipsCount: number;
  partTimeCount: number;
  entryLevelCount: number;
  liveProjectsCount: number;
  eventsCount: number;
  skillProgramsCount: number;
  totalDemoRecords: number;
  seedVersion: string | null;
  lastUpdated: string | null;
}

const INDIAN_LOCATIONS = [
  'Dehradun',
  'Delhi',
  'Noida',
  'Gurugram',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Jaipur',
  'Chandigarh',
  'Lucknow',
  'Remote — India',
] as const;

const WORK_MODES: WorkMode[] = ['on_site', 'hybrid', 'remote'];

const RECENT_MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

interface FictionalCompanyDef {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  description: string;
}

const FICTIONAL_COMPANIES: FictionalCompanyDef[] = [
  { id: 'demo_comp_001', name: 'ElevateEdge Solutions', industry: 'Management Consulting & Strategy', location: 'Dehradun', size: '120–250 employees', description: 'Fictional demo advisory firm simulating campus strategy, operations, and analytics tracks for student career exploration.' },
  { id: 'demo_comp_002', name: 'FinBridge Analytics', industry: 'Financial Services & FinTech', location: 'Mumbai', size: '250–500 employees', description: 'Fictional demo financial analytics studio modeling corporate valuation, equity research, and accounting workflows.' },
  { id: 'demo_comp_003', name: 'GrowthSphere Media', industry: 'Digital Marketing & Media', location: 'Gurugram', size: '80–150 employees', description: 'Fictional demo performance marketing and social media collective created for student portfolio demonstrations.' },
  { id: 'demo_comp_004', name: 'NextGen Business Labs', industry: 'Business Analytics & Research', location: 'Bengaluru', size: '150–300 employees', description: 'Fictional demo innovation lab showcasing Power BI, SQL, and business intelligence tracks for learners.' },
  { id: 'demo_comp_005', name: 'CareerNest Technologies', industry: 'Software & EdTech', location: 'Noida', size: '200–400 employees', description: 'Fictional demo software engineering organization representing full-stack web and product internships.' },
  { id: 'demo_comp_006', name: 'BluePeak Consulting', industry: 'Operations & Supply Chain', location: 'Delhi', size: '300–600 employees', description: 'Fictional demo consulting group simulating logistics optimization, procurement, and business operations roles.' },
  { id: 'demo_comp_007', name: 'TalentSpring Solutions', industry: 'Human Resources & Recruiting', location: 'Pune', size: '60–120 employees', description: 'Fictional demo talent operations firm showcasing HR analytics, campus hiring, and employee engagement roles.' },
  { id: 'demo_comp_008', name: 'MarketMinds Research', industry: 'Market Research & Consumer Insights', location: 'Hyderabad', size: '100–200 employees', description: 'Fictional demo research agency illustrating consumer survey design, competitor benchmarking, and brand studies.' },
  { id: 'demo_comp_009', name: 'FuturePath Ventures', industry: 'Venture Capital & Startup Studio', location: 'Bengaluru', size: '40–80 employees', description: 'Fictional demo venture studio presenting startup research, financial modelling, and founder office roles.' },
  { id: 'demo_comp_010', name: 'BrightAxis Technologies', industry: 'Information Technology & Cloud', location: 'Dehradun', size: '90–180 employees', description: 'Fictional demo technology studio focused on frontend engineering, QA automation, and data platforms.' },
  { id: 'demo_comp_011', name: 'SkillOrbit Learning', industry: 'Professional Education & Training', location: 'Remote — India', size: '75–150 employees', description: 'Fictional demo training academy hosting structured Excel, SQL, Power BI, and interview preparation cohorts.' },
  { id: 'demo_comp_012', name: 'VentureCraft Labs', industry: 'Product Design & SaaS', location: 'Pune', size: '50–100 employees', description: 'Fictional demo product design and growth lab highlighting UI/UX, graphic design, and content systems.' },
  { id: 'demo_comp_013', name: 'InsightLoop Analytics', industry: 'Data Science & Analytics', location: 'Hyderabad', size: '180–350 employees', description: 'Fictional demo data consulting partner showcasing Python, SQL, and dashboard engineering opportunities.' },
  { id: 'demo_comp_014', name: 'PrimeRoute Logistics', industry: 'Logistics & Supply Chain', location: 'Jaipur', size: '400–800 employees', description: 'Fictional demo freight and distribution operator representing warehouse analytics and fleet coordination roles.' },
  { id: 'demo_comp_015', name: 'Excelora Finance', industry: 'Investment Banking & Corporate Finance', location: 'Mumbai', size: '120–240 employees', description: 'Fictional demo corporate finance boutique simulating financial modelling, deal screening, and credit analysis.' },
  { id: 'demo_comp_016', name: 'DoonCrest Advisory', industry: 'Accounting & Tax Consulting', location: 'Dehradun', size: '50–100 employees', description: 'Fictional demo regional accounting and audit practice modeling student accounting and finance apprenticeships.' },
  { id: 'demo_comp_017', name: 'VanguardPeak Retail', industry: 'Retail & E-Commerce', location: 'Chandigarh', size: '250–500 employees', description: 'Fictional demo retail brand illustrating merchandising, sales operations, and customer support tracks.' },
  { id: 'demo_comp_018', name: 'ClearLedger Capital', industry: 'Equity Research & Wealth Advisory', location: 'Delhi', size: '70–140 employees', description: 'Fictional demo capital markets desk focusing on sector coverage, stock fundamentals, and research memos.' },
  { id: 'demo_comp_019', name: 'SparkGrid Digital', industry: 'Content & Creative Studio', location: 'Noida', size: '45–90 employees', description: 'Fictional demo creative studio simulating editorial copywriting, graphic design, and brand campaigns.' },
  { id: 'demo_comp_020', name: 'NorthStar Commerce', industry: 'B2B Sales & Distribution', location: 'Lucknow', size: '150–300 employees', description: 'Fictional demo commercial distribution network offering student sales and territory operations training.' },
  { id: 'demo_comp_021', name: 'Kumaon TechWorks', industry: 'Web & Mobile Engineering', location: 'Dehradun', size: '60–120 employees', description: 'Fictional demo regional software house showcasing web development, React, and backend API roles.' },
  { id: 'demo_comp_022', name: 'QuantLeaf Systems', industry: 'Business Intelligence & FinTech', location: 'Bengaluru', size: '220–450 employees', description: 'Fictional demo analytics software firm specializing in KPI reporting, risk analytics, and financial models.' },
  { id: 'demo_comp_023', name: 'HarborLine Operations', industry: 'Supply Chain & Procurement', location: 'Mumbai', size: '300–550 employees', description: 'Fictional demo operations enterprise modeling vendor analysis, inventory forecasting, and fulfillment.' },
  { id: 'demo_comp_024', name: 'CivicPulse Research', industry: 'Policy & Economic Research', location: 'Delhi', size: '35–70 employees', description: 'Fictional demo research collective providing undergraduate and postgraduate research assistant opportunities.' },
  { id: 'demo_comp_025', name: 'PulseCraft Marketing', industry: 'Brand Strategy & Performance', location: 'Gurugram', size: '95–180 employees', description: 'Fictional demo brand consultancy illustrating SEO, paid media, and marketing analytics fellowships.' },
  { id: 'demo_comp_026', name: 'SummitStride Careers', industry: 'Campus Readiness & Workshops', location: 'Dehradun', size: '40–85 employees', description: 'Fictional demo career readiness organization hosting placement prep workshops and mock interview clinics.' },
  { id: 'demo_comp_027', name: 'MetricWave Cloud', industry: 'Cloud Computing & DevOps', location: 'Hyderabad', size: '140–280 employees', description: 'Fictional demo cloud platform company simulating software engineering, SQL, and Python roles.' },
  { id: 'demo_comp_028', name: 'OrbitReach Customer Care', industry: 'Customer Experience & Support', location: 'Jaipur', size: '180–350 employees', description: 'Fictional demo customer success partner offering flexible student support and CRM associate roles.' },
  { id: 'demo_comp_029', name: 'Aurelia Consumer Brands', industry: 'FMCG & Consumer Goods', location: 'Chandigarh', size: '200–400 employees', description: 'Fictional demo consumer goods group highlighting brand marketing, retail sales, and market studies.' },
  { id: 'demo_comp_030', name: 'VertexFlow Industrial', industry: 'Manufacturing & Operations', location: 'Pune', size: '350–700 employees', description: 'Fictional demo industrial enterprise modeling lean operations, quality systems, and supply chain roles.' },
];

interface TrackTemplate {
  subCategory: string;
  roleVariants: string[];
  skills: string[];
  education: string;
  eligibility: string;
  responsibilities: string[];
  industryHint: string;
}

const INTERNSHIP_TRACKS: TrackTemplate[] = [
  {
    subCategory: 'Finance Internships',
    roleVariants: ['Corporate Finance Intern', 'Finance Operations Intern', 'FP&A Finance Intern', 'Treasury & Finance Intern'],
    skills: ['Excel', 'Financial Analysis', 'Accounting', 'PowerPoint', 'Budgeting'],
    education: 'B.Com / BBA / MBA (Finance) / CA Inter',
    eligibility: 'Undergraduate or MBA students with foundational knowledge of accounting and spreadsheets.',
    responsibilities: [
      'Assist finance analysts in preparing monthly variance and budget trackers in Excel',
      'Reconcile vendor invoices and support quarterly financial reporting packets',
      'Research sector benchmarks for internal corporate finance presentations',
    ],
    industryHint: 'Finance',
  },
  {
    subCategory: 'Marketing Internships',
    roleVariants: ['Brand Marketing Intern', 'Growth Marketing Intern', 'Product Marketing Intern', 'Campus Marketing Intern'],
    skills: ['Marketing Strategy', 'Market Research', 'Excel', 'Canva', 'Communication'],
    education: 'BBA / MBA (Marketing) / B.Com / Any Graduate',
    eligibility: 'College students passionate about brand positioning, customer outreach, and campaign analysis.',
    responsibilities: [
      'Support go-to-market campaign execution and regional campus outreach initiatives',
      'Track lead funnels and prepare weekly marketing performance summaries',
      'Coordinate collateral reviews with design and content contributors',
    ],
    industryHint: 'Marketing',
  },
  {
    subCategory: 'Human Resources Internships',
    roleVariants: ['HR Talent Acquisition Intern', 'People Operations Intern', 'HR Generalist Intern', 'Campus Recruitment Intern'],
    skills: ['Recruitment', 'HR Operations', 'Excel', 'Communication', 'LinkedIn Sourcing'],
    education: 'MBA (HR) / BBA / B.A. Psychology / Any Graduate',
    eligibility: 'Students pursuing HR or management programs with strong interpersonal communication.',
    responsibilities: [
      'Screen candidate profiles and coordinate interview schedules with hiring panels',
      'Maintain applicant tracking sheets and onboarding checklists',
      'Assist in planning campus engagement and employee feedback surveys',
    ],
    industryHint: 'Human Resources',
  },
  {
    subCategory: 'Business Development Internships',
    roleVariants: ['Business Development Intern', 'B2B Partnerships Intern', 'Client Acquisition Intern', 'Growth Partnerships Intern'],
    skills: ['Business Development', 'Lead Generation', 'CRM', 'Negotiation', 'Communication'],
    education: 'BBA / MBA / B.Tech / Any Graduate',
    eligibility: 'Proactive undergraduate or postgraduate students comfortable with client outreach.',
    responsibilities: [
      'Identify prospective regional partners and build structured lead pipelines',
      'Prepare customized pitch decks and track follow-ups in CRM dashboards',
      'Shadow senior account managers during client discovery calls',
    ],
    industryHint: 'Business Development',
  },
  {
    subCategory: 'Sales Internships',
    roleVariants: ['Inside Sales Intern', 'Field Sales Strategy Intern', 'Channel Sales Intern', 'Enterprise Sales Intern'],
    skills: ['Sales Strategy', 'CRM', 'Lead Qualification', 'Presentation', 'Excel'],
    education: 'BBA / MBA / B.Com / Any Graduate',
    eligibility: 'Goal-oriented students eager to gain hands-on B2B or B2C sales funnel exposure.',
    responsibilities: [
      'Qualify inbound inquiries and schedule product demonstrations',
      'Analyze conversion metrics across regional sales territories',
      'Document customer objections to refine outreach playbooks',
    ],
    industryHint: 'Sales',
  },
  {
    subCategory: 'Data Analytics Internships',
    roleVariants: ['Data Analytics Intern', 'Junior Data Analyst Intern', 'SQL & Reporting Intern', 'BI Analytics Intern'],
    skills: ['SQL', 'Excel', 'Power BI', 'Python', 'Data Visualization'],
    education: 'B.Tech / BCA / B.Sc (CS/Stats) / MBA Analytics',
    eligibility: 'Students comfortable writing SQL queries, pivot tables, and cleaning tabular datasets.',
    responsibilities: [
      'Clean and transform multi-source datasets using SQL and Excel',
      'Build automated KPI dashboards in Power BI for weekly stakeholder reviews',
      'Validate data anomalies and document metric definitions clearly',
    ],
    industryHint: 'Data Analytics',
  },
  {
    subCategory: 'Business Analytics Internships',
    roleVariants: ['Business Analyst Intern', 'Business Analytics & Strategy Intern', 'Product Analytics Intern', 'Decision Analytics Intern'],
    skills: ['Business Analysis', 'Excel', 'SQL', 'Power BI', 'Problem Solving'],
    education: 'MBA / B.Tech / BBA / Economics',
    eligibility: 'Analytical students capable of translating business questions into structured metrics.',
    responsibilities: [
      'Map operational workflows and quantify efficiency bottlenecks',
      'Synthesize customer cohorts and retention trends into executive slide decks',
      'Collaborate with engineering and operations teams on requirement specs',
    ],
    industryHint: 'Business Analytics',
  },
  {
    subCategory: 'Digital Marketing Internships',
    roleVariants: ['Digital Marketing Intern', 'SEO & Performance Intern', 'Paid Media & Analytics Intern', 'Email & Funnel Marketing Intern'],
    skills: ['Digital Marketing', 'SEO', 'Google Analytics', 'Meta Ads', 'Content Strategy'],
    education: 'BBA / MBA / B.J.M.C. / Any Graduate',
    eligibility: 'Students familiar with search marketing, campaign metrics, and web analytics.',
    responsibilities: [
      'Conduct keyword research and on-page SEO audits for web landing pages',
      'Monitor CTR, CPA, and conversion metrics across demo ad campaigns',
      'Draft structured A/B testing briefs for landing page copy',
    ],
    industryHint: 'Digital Marketing',
  },
  {
    subCategory: 'Operations Internships',
    roleVariants: ['Business Operations Intern', 'Operations Excellence Intern', 'Process Improvement Intern', 'Service Operations Intern'],
    skills: ['Operations Management', 'Excel', 'SOP Documentation', 'Process Mapping', 'Data Analysis'],
    education: 'BBA / MBA (Operations) / B.Tech / Any Graduate',
    eligibility: 'Detail-oriented students interested in scaling daily workflows and SLA tracking.',
    responsibilities: [
      'Track daily turnaround SLAs and highlight recurring fulfillment delays',
      'Draft standard operating procedures for cross-functional onboarding',
      'Coordinate vendor reporting sheets across regional hubs',
    ],
    industryHint: 'Operations',
  },
  {
    subCategory: 'Supply Chain Internships',
    roleVariants: ['Supply Chain Analyst Intern', 'Procurement & Sourcing Intern', 'Inventory Planning Intern', 'Demand Forecasting Intern'],
    skills: ['Supply Chain', 'Excel', 'Inventory Management', 'SQL', 'Vendor Management'],
    education: 'MBA (Operations/SCM) / B.Tech (Mechanical/Industrial) / BBA',
    eligibility: 'Students studying operations, engineering, or supply chain management.',
    responsibilities: [
      'Analyze stock-out frequency and reorder point thresholds using Excel models',
      'Evaluate supplier lead-time scorecards across North India corridors',
      'Assist procurement planners with quotation comparisons',
    ],
    industryHint: 'Supply Chain',
  },
  {
    subCategory: 'Logistics Internships',
    roleVariants: ['Logistics Coordinator Intern', 'Fleet & Dispatch Intern', 'Warehouse Analytics Intern', 'Distribution Operations Intern'],
    skills: ['Logistics', 'Route Planning', 'Excel', 'Dispatch Tracking', 'Operations'],
    education: 'BBA / B.Com / MBA / B.Tech',
    eligibility: 'Students seeking practical exposure to freight coordination and fulfillment hubs.',
    responsibilities: [
      'Monitor shipment milestones and update regional dispatch dashboards',
      'Analyze last-mile delivery exceptions and propose route optimizations',
      'Coordinate daily inventory counts with hub supervisors',
    ],
    industryHint: 'Logistics',
  },
  {
    subCategory: 'Finance and Accounting Internships',
    roleVariants: ['Finance & Accounting Intern', 'Accounts Payable & Audit Intern', 'Tax & Bookkeeping Intern', 'Financial Reporting Intern'],
    skills: ['Accounting', 'Tally', 'Excel', 'GST Basics', 'Financial Statements'],
    education: 'B.Com / M.Com / MBA Finance / CA Articleship Prep',
    eligibility: 'Commerce and finance students with solid grasp of ledger entries and balance sheets.',
    responsibilities: [
      'Assist with bank reconciliations, journal entries, and trial balance checks',
      'Prepare GST summary schedules and supporting audit documentation',
      'Maintain clean expense categorization sheets in Excel',
    ],
    industryHint: 'Finance & Accounting',
  },
  {
    subCategory: 'Investment Banking Internships',
    roleVariants: ['Investment Banking Analyst Intern', 'M&A Deal Research Intern', 'Valuation & IB Intern', 'Capital Markets Intern'],
    skills: ['Financial Modelling', 'Valuation', 'DCF', 'Excel', 'Pitch Decks'],
    education: 'MBA (Finance) / B.Com (Hons) / Economics / CFA Level 1 Candidate',
    eligibility: 'Finance students with strong quantitative aptitude and financial statement literacy.',
    responsibilities: [
      'Build comparable company valuation tables and precedent transaction sheets',
      'Draft concise industry landscape profiles for client pitch books',
      'Support DCF sensitivity modeling under senior analyst guidance',
    ],
    industryHint: 'Investment Banking',
  },
  {
    subCategory: 'Equity Research Internships',
    roleVariants: ['Equity Research Intern', 'Sector Equity Analyst Intern', 'Fundamental Research Intern', 'Capital Research Intern'],
    skills: ['Equity Research', 'Financial Statements', 'Excel', 'Valuation', 'Report Writing'],
    education: 'MBA (Finance) / B.Com / Economics / BBA Finance',
    eligibility: 'Students actively tracking listed Indian equities and annual reports.',
    responsibilities: [
      'Analyze quarterly earnings transcripts and update financial ratio models',
      'Draft structured two-page initiation notes on mid-cap Indian sectors',
      'Track macroeconomic indicators impacting sector revenue drivers',
    ],
    industryHint: 'Equity Research',
  },
  {
    subCategory: 'Software Development Internships',
    roleVariants: ['Software Development Intern', 'Backend Engineering Intern', 'Python Developer Intern', 'Full-Stack Software Intern'],
    skills: ['JavaScript', 'TypeScript', 'Python', 'Git', 'REST APIs'],
    education: 'B.Tech (CS/IT) / MCA / BCA / B.Sc Computer Science',
    eligibility: 'Students with working project experience in modern programming languages and Git.',
    responsibilities: [
      'Implement modular backend endpoints and automated unit tests',
      'Debug staging issues and collaborate through structured pull requests',
      'Document API contracts and database schema updates',
    ],
    industryHint: 'Software Development',
  },
  {
    subCategory: 'Web Development Internships',
    roleVariants: ['Frontend Web Development Intern', 'React & TypeScript Intern', 'UI Web Developer Intern', 'Full-Stack Web Intern'],
    skills: ['React', 'HTML', 'CSS', 'TypeScript', 'Tailwind CSS'],
    education: 'B.Tech / BCA / MCA / B.Sc IT',
    eligibility: 'Students with portfolio links demonstrating responsive web applications.',
    responsibilities: [
      'Build responsive React components following accessibility and layout standards',
      'Integrate client-side filters, pagination, and API error states',
      'Optimize bundle size and page rendering performance across viewports',
    ],
    industryHint: 'Web Development',
  },
  {
    subCategory: 'Graphic Design Internships',
    roleVariants: ['Graphic Design Intern', 'Brand Visual Designer Intern', 'UI & Visual Design Intern', 'Social Creative Intern'],
    skills: ['Figma', 'Adobe Illustrator', 'Photoshop', 'Typography', 'Brand Design'],
    education: 'B.Des / BFA / B.Sc Multimedia / Any Creative Portfolio',
    eligibility: 'Students with a design portfolio showcasing layout, typography, and brand systems.',
    responsibilities: [
      'Design campaign graphics, event posters, and clean presentation templates',
      'Maintain typography and color consistency across brand guidelines',
      'Iterate quickly on visual concepts based on creative director critiques',
    ],
    industryHint: 'Graphic Design',
  },
  {
    subCategory: 'Content Writing Internships',
    roleVariants: ['Content Writing Intern', 'Technical & Blog Writer Intern', 'Copywriting Intern', 'Editorial Research Intern'],
    skills: ['Content Writing', 'Copywriting', 'SEO Writing', 'Editing', 'Research'],
    education: 'B.A. English / Journalism / BBA / Any Graduate',
    eligibility: 'Students with strong command of clear written English and original writing samples.',
    responsibilities: [
      'Research and write long-form career guides, case studies, and web copy',
      'Edit drafts for clarity, factual accuracy, and consistent editorial voice',
      'Collaborate with SEO specialists on structured article outlines',
    ],
    industryHint: 'Content Writing',
  },
  {
    subCategory: 'Social Media Internships',
    roleVariants: ['Social Media Management Intern', 'Community & Content Intern', 'Short-Form Video Strategy Intern', 'Social Analytics Intern'],
    skills: ['Social Media', 'Content Calendars', 'Copywriting', 'Analytics', 'Canva'],
    education: 'BBA / Mass Communication / Any Graduate',
    eligibility: 'Students who understand audience engagement patterns and platform analytics.',
    responsibilities: [
      'Plan weekly multi-channel content calendars across LinkedIn and Instagram',
      'Track engagement rates, follower retention, and campaign reach',
      'Respond professionally to student community comments and queries',
    ],
    industryHint: 'Social Media',
  },
  {
    subCategory: 'Research Internships',
    roleVariants: ['Market & Policy Research Intern', 'Academic Research Intern', 'Industry Research Analyst Intern', 'Qualitative Research Intern'],
    skills: ['Research Methods', 'Survey Design', 'Excel', 'Report Writing', 'Data Synthesis'],
    education: 'B.A. / B.Sc / M.A. / MBA / Any Research-Oriented Student',
    eligibility: 'Curious students skilled in primary interviews, secondary synthesis, and citations.',
    responsibilities: [
      'Conduct structured desk research and compile annotated evidence tables',
      'Design student and consumer questionnaires and analyze response patterns',
      'Draft executive briefs summarizing actionable research findings',
    ],
    industryHint: 'Research',
  },
];

const PART_TIME_ROLES = [
  { role: 'Sales Executive', skills: ['Sales', 'Communication', 'CRM', 'Lead Follow-up'], edu: 'Any Undergraduate / MBA' },
  { role: 'Business Development Associate', skills: ['Business Development', 'Outreach', 'Presentation', 'Excel'], edu: 'BBA / MBA / Any Graduate' },
  { role: 'Campus Ambassador', skills: ['Campus Outreach', 'Event Promotion', 'Social Media', 'Leadership'], edu: 'Current College Student (Any Stream)' },
  { role: 'Social Media Assistant', skills: ['Social Media', 'Canva', 'Scheduling', 'Copywriting'], edu: 'Any Graduate / Mass Comm' },
  { role: 'Content Writer', skills: ['Content Writing', 'Editing', 'Research', 'SEO Basics'], edu: 'B.A. / Journalism / Any Stream' },
  { role: 'Data Entry Assistant', skills: ['Excel', 'Data Accuracy', 'Google Sheets', 'Documentation'], edu: '12th Pass / Any Undergraduate' },
  { role: 'Customer Support Executive', skills: ['Customer Support', 'Communication', 'Ticketing Tools', 'Empathy'], edu: 'Any Undergraduate / Graduate' },
  { role: 'Event Coordinator', skills: ['Event Coordination', 'Logistics', 'Vendor Follow-up', 'Time Management'], edu: 'BBA / Hospitality / Any Stream' },
  { role: 'Research Assistant', skills: ['Secondary Research', 'Excel', 'Survey Analysis', 'Documentation'], edu: 'UG / PG Students (Any Discipline)' },
  { role: 'Marketing Assistant', skills: ['Marketing', 'Campaign Tracking', 'Canva', 'Excel'], edu: 'BBA / B.Com / MBA' },
  { role: 'Retail Associate', skills: ['Customer Service', 'Merchandising', 'POS Operations', 'Communication'], edu: 'Any College Student' },
  { role: 'Virtual Assistant', skills: ['Calendar Management', 'Google Workspace', 'Excel', 'Communication'], edu: 'Any Undergraduate / Graduate' },
  { role: 'Telecalling Executive', skills: ['Verbal Communication', 'CRM Logging', 'Hindi & English', 'Lead Qualification'], edu: 'Any Undergraduate / Graduate' },
];

const ENTRY_LEVEL_ROLES = [
  { role: 'Graduate Trainee', skills: ['Problem Solving', 'Excel', 'Communication', 'Project Coordination'], edu: 'Final Year / Fresh Graduate (Any Stream)' },
  { role: 'Management Trainee', skills: ['Business Strategy', 'Analytics', 'Leadership', 'Presentation'], edu: 'MBA / PGDM Freshers' },
  { role: 'Junior Financial Analyst', skills: ['Financial Modelling', 'Excel', 'Accounting', 'Valuation'], edu: 'B.Com / MBA Finance / CFA Candidate' },
  { role: 'Business Analyst', skills: ['Business Analysis', 'SQL', 'Excel', 'Power BI', 'Stakeholder Alignment'], edu: 'B.Tech / MBA / BBA Analytics' },
  { role: 'HR Executive', skills: ['Recruitment', 'HRIS', 'Onboarding', 'Employee Relations'], edu: 'MBA HR / BBA HR' },
  { role: 'Marketing Executive', skills: ['Brand Marketing', 'Digital Campaigns', 'Market Research', 'CRM'], edu: 'BBA / MBA Marketing' },
  { role: 'Sales Officer', skills: ['Territory Sales', 'B2B Outreach', 'Negotiation', 'Pipeline Management'], edu: 'Graduate / MBA Sales' },
  { role: 'Operations Executive', skills: ['Operations', 'Excel', 'SLA Tracking', 'Vendor Coordination'], edu: 'BBA / B.Tech / MBA Operations' },
  { role: 'Junior Accountant', skills: ['Accounting', 'Tally', 'GST', 'Excel', 'Reconciliation'], edu: 'B.Com / M.Com' },
  { role: 'Customer Relationship Executive', skills: ['CRM', 'Account Retention', 'Communication', 'Support'], edu: 'Any Graduate' },
  { role: 'Recruitment Associate', skills: ['Talent Sourcing', 'Interview Coordination', 'LinkedIn', 'ATS'], edu: 'BBA / MBA / Any Graduate' },
  { role: 'Research Analyst', skills: ['Market Research', 'Data Analysis', 'Excel', 'Report Writing'], edu: 'Economics / MBA / B.Sc / B.Com' },
  { role: 'Business Development Executive', skills: ['Business Development', 'Lead Generation', 'Client Pitching', 'CRM'], edu: 'BBA / MBA / Any Graduate' },
];

const LIVE_PROJECT_TRACKS = [
  { topic: 'Financial Statement Analysis', skills: ['Financial Statements', 'Ratio Analysis', 'Excel', 'Accounting'], edu: 'B.Com / BBA / MBA Finance' },
  { topic: 'Equity Research Project', skills: ['Equity Research', 'Valuation', 'Excel', 'Sector Analysis'], edu: 'MBA Finance / B.Com / Economics' },
  { topic: 'Market Research Project', skills: ['Market Research', 'Survey Design', 'Data Synthesis', 'Presentation'], edu: 'BBA / MBA / Any Graduate' },
  { topic: 'Consumer Behaviour Analysis', skills: ['Consumer Insights', 'Qualitative Interviews', 'Excel', 'Marketing'], edu: 'BBA / MBA Marketing / Psychology' },
  { topic: 'Digital Marketing Campaign', skills: ['Digital Marketing', 'SEO', 'Performance Analytics', 'Copywriting'], edu: 'Any Undergraduate / MBA' },
  { topic: 'Business Analytics Dashboard', skills: ['Business Analytics', 'Excel', 'SQL', 'KPI Design'], edu: 'B.Tech / MBA / BBA / BCA' },
  { topic: 'Power BI Dashboard Project', skills: ['Power BI', 'DAX', 'Data Modeling', 'Excel'], edu: 'B.Tech / BCA / MBA Analytics / B.Com' },
  { topic: 'Supply Chain Analysis', skills: ['Supply Chain', 'Inventory Optimization', 'Excel', 'Operations'], edu: 'MBA Operations / B.Tech / BBA' },
  { topic: 'HR Analytics Project', skills: ['HR Analytics', 'Attrition Modeling', 'Excel', 'Power BI'], edu: 'MBA HR / BBA / Psychology' },
  { topic: 'Competitor Analysis', skills: ['Competitive Benchmarking', 'Strategy', 'Research', 'PowerPoint'], edu: 'BBA / MBA / Economics' },
  { topic: 'Financial Modelling', skills: ['Financial Modelling', '3-Statement Model', 'DCF', 'Excel'], edu: 'MBA Finance / B.Com / BBA' },
  { topic: 'Startup Research', skills: ['Startup Evaluation', 'Market Sizing', 'Pitch Analysis', 'Research'], edu: 'Any Undergraduate / Postgraduate' },
  { topic: 'Sales Strategy Project', skills: ['Sales Strategy', 'Funnel Analysis', 'CRM', 'Go-To-Market'], edu: 'BBA / MBA Sales & Marketing' },
  { topic: 'Operations Improvement Project', skills: ['Process Mapping', 'Lean Operations', 'Excel', 'SLA Analysis'], edu: 'B.Tech / MBA Operations / BBA' },
];

const EVENT_TRACKS: Array<{ subCategory: string; eventType: EventType; titlePrefix: string }> = [
  { subCategory: 'Internship Fairs', eventType: 'campus_event', titlePrefix: 'Campus Internship Discovery Fair' },
  { subCategory: 'Career Development Workshops', eventType: 'career_workshop', titlePrefix: 'Career Readiness & Roadmap Workshop' },
  { subCategory: 'Resume Building Workshops', eventType: 'placement_prep', titlePrefix: 'ATS Resume & Portfolio Clinic' },
  { subCategory: 'Mock Interview Sessions', eventType: 'placement_prep', titlePrefix: '1-on-1 Mock Interview Practice Lab' },
  { subCategory: 'Group Discussion Events', eventType: 'placement_prep', titlePrefix: 'Placement Group Discussion Arena' },
  { subCategory: 'Business Plan Competitions', eventType: 'campus_event', titlePrefix: 'Student Venture & Business Plan Pitch' },
  { subCategory: 'Entrepreneurship Events', eventType: 'networking', titlePrefix: 'Campus Founders & Startup Summit' },
  { subCategory: 'Finance Workshops', eventType: 'career_workshop', titlePrefix: 'Applied Corporate Finance & Markets Workshop' },
  { subCategory: 'Marketing Events', eventType: 'career_workshop', titlePrefix: 'Brand Strategy & Digital Growth Conclave' },
  { subCategory: 'Networking Sessions', eventType: 'networking', titlePrefix: 'Alumni & Industry Mentor Networking Mixer' },
  { subCategory: 'Placement Preparation Events', eventType: 'placement_prep', titlePrefix: 'Pre-Placement Aptitude & Case Bootcamp' },
  { subCategory: 'Hackathons', eventType: 'skill_session', titlePrefix: '24-Hour Student Product & Data Hackathon' },
  { subCategory: 'College Festivals', eventType: 'campus_event', titlePrefix: 'Annual Inter-College Career & Innovation Fest' },
  { subCategory: 'Leadership Workshops', eventType: 'skill_session', titlePrefix: 'Campus Leadership & Team Management Seminar' },
];

const SKILL_TOPICS = [
  { topic: 'Excel Training', skills: ['Excel', 'Formulas', 'Pivot Tables', 'Data Cleaning'], level: 'Beginner' },
  { topic: 'Advanced Excel', skills: ['Advanced Excel', 'XLOOKUP', 'Macros', 'Dashboards'], level: 'Intermediate' },
  { topic: 'Power BI', skills: ['Power BI', 'DAX', 'Power Query', 'Data Visualization'], level: 'Intermediate' },
  { topic: 'Financial Modelling', skills: ['Financial Modelling', 'Excel', 'DCF', 'Valuation'], level: 'Intermediate' },
  { topic: 'Data Analytics', skills: ['Data Analytics', 'SQL', 'Excel', 'Power BI'], level: 'Beginner to Intermediate' },
  { topic: 'Business Communication', skills: ['Business Writing', 'Email Etiquette', 'Presentations', 'Communication'], level: 'All Levels' },
  { topic: 'Interview Preparation', skills: ['Behavioral Interviews', 'Case Prep', 'HR Rounds', 'Storytelling'], level: 'All Levels' },
  { topic: 'Resume Building', skills: ['Resume Writing', 'ATS Formatting', 'LinkedIn Profile', 'Portfolio'], level: 'Beginner' },
  { topic: 'Digital Marketing', skills: ['Digital Marketing', 'SEO', 'Google Analytics', 'Social Media'], level: 'Beginner' },
  { topic: 'Python Basics', skills: ['Python', 'Pandas', 'Scripting', 'Problem Solving'], level: 'Beginner' },
  { topic: 'SQL', skills: ['SQL', 'Joins', 'Aggregations', 'Database Queries'], level: 'Beginner to Intermediate' },
  { topic: 'Public Speaking', skills: ['Public Speaking', 'Stage Confidence', 'Executive Presence', 'Debate'], level: 'All Levels' },
  { topic: 'Project Management', skills: ['Project Management', 'Agile Basics', 'Sprint Planning', 'Documentation'], level: 'Intermediate' },
  { topic: 'Investment Research', skills: ['Investment Research', 'Equity Analysis', 'Financial Statements', 'Valuation'], level: 'Intermediate' },
  { topic: 'Stock Market Fundamentals', skills: ['Stock Market', 'Fundamental Analysis', 'Portfolio Basics', 'Finance'], level: 'Beginner' },
];

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

function futureDateIso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

interface BatchWriteItem {
  ref: DocumentReference;
  data: Record<string, unknown>;
}

async function commitInSafeChunks(
  items: BatchWriteItem[],
  phaseLabel: string,
  baseCompleted: number,
  totalOps: number,
  onProgress?: (p: DemoGenerationProgress) => void
): Promise<{ written: number; errors: string[] }> {
  let written = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += SAFE_BATCH_SIZE) {
    const chunk = items.slice(i, i + SAFE_BATCH_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      batch.set(item.ref, item.data);
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${phaseLabel} batch ${Math.floor(i / SAFE_BATCH_SIZE) + 1}: ${msg}`);
    }
    onProgress?.({
      phase: phaseLabel,
      completedOps: baseCompleted + Math.min(i + chunk.length, items.length),
      totalOps,
      insertedRecords: baseCompleted + written,
      errors: [...errors],
    });
  }

  return { written, errors };
}

export async function generateBulkDemoDataset(
  adminUid: string,
  onProgress?: (progress: DemoGenerationProgress) => void
): Promise<DemoDatasetStats & { errors: string[] }> {
  const safeAdmin = sanitizeId(adminUid);
  const allErrors: string[] = [];

  // Target counts: 30 companies + 520 internships + 110 part-time + 110 entry-level + 110 live projects + 105 events + 105 skill programs (stored in opportunities + skillDevelopment)
  const INTERNSHIP_COUNT = 520;
  const PART_TIME_COUNT = 110;
  const ENTRY_LEVEL_COUNT = 110;
  const LIVE_PROJECT_COUNT = 110;
  const EVENT_COUNT = 105;
  const SKILL_COUNT = 105;

  const totalOps =
    FICTIONAL_COMPANIES.length +
    INTERNSHIP_COUNT +
    PART_TIME_COUNT +
    ENTRY_LEVEL_COUNT +
    LIVE_PROJECT_COUNT +
    EVENT_COUNT +
    SKILL_COUNT * 2; // written to skillDevelopment + mirrored in opportunities for unified search

  let completedOps = 0;

  // 1. Fictional Demo Companies (must commit BEFORE opportunities so company exists() checks pass)
  const companyWrites: BatchWriteItem[] = FICTIONAL_COMPANIES.map((c) => ({
    ref: doc(db, 'companies', c.id),
    data: {
      companyId: c.id,
      name: c.name,
      industry: c.industry,
      description: c.description,
      website: `https://demo-${c.id.replace('demo_comp_', 'org')}.campusconnect.example`,
      location: c.location,
      logoUrl: '',
      companySize: c.size,
      verificationStatus: 'demo',
      isDemo: true,
      demoLabel: 'DEMO DATA',
      seedVersion: CURRENT_DEMO_SEED_VERSION,
      createdBy: safeAdmin,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  }));

  const compRes = await commitInSafeChunks(
    companyWrites,
    'Writing 30 fictional demo companies',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += companyWrites.length;
  allErrors.push(...compRes.errors);

  // 2. 520 Synthetic Demo Internships
  const internshipDurations = ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months'];
  const internshipWrites: BatchWriteItem[] = [];
  for (let i = 0; i < INTERNSHIP_COUNT; i++) {
    const track = INTERNSHIP_TRACKS[i % INTERNSHIP_TRACKS.length];
    const comp = FICTIONAL_COMPANIES[(i * 7 + 3) % FICTIONAL_COMPANIES.length];
    const loc = INDIAN_LOCATIONS[(i * 5) % INDIAN_LOCATIONS.length];
    const workMode: WorkMode = loc === 'Remote — India' ? 'remote' : WORK_MODES[i % WORK_MODES.length];
    const roleName = track.roleVariants[i % track.roleVariants.length];
    const cohortTag = ['Summer', 'Winter', 'Spring', 'Autumn', 'Campus', 'Accelerated'][i % 6];
    const stipendMin = 3000 + ((i * 1500) % 16000);
    const stipendMax = Math.min(25000, stipendMin + 2000 + ((i * 1000) % 5000));
    const oppId = `demo_intern_${pad4(i + 1)}`;

    internshipWrites.push({
      ref: doc(db, 'opportunities', oppId),
      data: {
        opportunityId: oppId,
        title: `${roleName} (${cohortTag} Cohort — ${loc.replace(' — India', '')})`,
        companyId: comp.id,
        companyName: comp.name,
        companyLogoUrl: '',
        industry: comp.industry,
        category: 'internship',
        subCategory: track.subCategory,
        opportunityType: 'Internship',
        description: `Synthetic demonstration listing for a ${track.subCategory.toLowerCase()} placement with ${comp.name} in ${loc}. Designed for college students seeking structured exposure in ${track.skills.slice(0, 3).join(', ')}.`,
        responsibilities: track.responsibilities,
        requiredSkills: track.skills,
        eligibility: track.eligibility,
        educationQualification: track.education,
        workMode,
        location: loc,
        isPaid: true,
        stipendMin,
        stipendMax,
        stipendLabel: `${formatInr(stipendMin)}–${formatInr(stipendMax)} / month`,
        duration: internshipDurations[i % internshipDurations.length],
        openings: 1 + (i % 8),
        deadline: futureDateIso(4 + ((i * 3) % 55)),
        requiredDocuments: ['Updated Resume (PDF)', 'College ID'],
        additionalQuestions: [
          `What interests you most about ${track.subCategory} at ${comp.name}?`,
        ],
        allowReapply: false,
        status: 'demo_approved',
        isVerified: false,
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth: RECENT_MONTHS[i % RECENT_MONTHS.length],
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const internRes = await commitInSafeChunks(
    internshipWrites,
    'Writing 520 demo internships',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += internshipWrites.length;
  allErrors.push(...internRes.errors);

  // 3. 110 Part-Time Jobs
  const partTimeDurations = ['3 Months', '4 Months', '6 Months', 'Flexible Ongoing'];
  const partTimeWrites: BatchWriteItem[] = [];
  for (let i = 0; i < PART_TIME_COUNT; i++) {
    const template = PART_TIME_ROLES[i % PART_TIME_ROLES.length];
    const comp = FICTIONAL_COMPANIES[(i * 3 + 11) % FICTIONAL_COMPANIES.length];
    const loc = INDIAN_LOCATIONS[(i * 7 + 1) % INDIAN_LOCATIONS.length];
    const workMode: WorkMode = loc === 'Remote — India' ? 'remote' : WORK_MODES[(i + 1) % WORK_MODES.length];
    const hoursPerWeek = [12, 15, 18, 20][i % 4];
    const stipendMin = 4000 + ((i * 1500) % 11000);
    const stipendMax = Math.min(20000, stipendMin + 2000 + ((i * 1000) % 4000));
    const oppId = `demo_part_${pad4(i + 1)}`;

    partTimeWrites.push({
      ref: doc(db, 'opportunities', oppId),
      data: {
        opportunityId: oppId,
        title: `Part-Time ${template.role} (${hoursPerWeek} hrs/week)`,
        companyId: comp.id,
        companyName: comp.name,
        companyLogoUrl: '',
        industry: comp.industry,
        category: 'part_time',
        subCategory: template.role,
        opportunityType: 'Part-Time Job',
        description: `Flexible student-friendly part-time ${template.role} demonstration listing with ${comp.name}. Scheduled around college lecture hours (${hoursPerWeek} hours/week) in ${loc}.`,
        responsibilities: [
          `Execute weekly ${template.role.toLowerCase()} deliverables aligned with team targets`,
          'Maintain clean daily activity trackers and coordinate with team leads',
          'Participate in brief weekly sync calls without disrupting semester exams',
        ],
        requiredSkills: template.skills,
        eligibility: `College students able to dedicate ${hoursPerWeek} flexible hours per week.`,
        educationQualification: template.edu,
        workMode,
        location: loc,
        isPaid: true,
        stipendMin,
        stipendMax,
        stipendLabel: `${formatInr(stipendMin)}–${formatInr(stipendMax)} / month`,
        duration: partTimeDurations[i % partTimeDurations.length],
        openings: 1 + (i % 6),
        deadline: futureDateIso(5 + ((i * 4) % 50)),
        requiredDocuments: ['Updated Resume (PDF)'],
        additionalQuestions: ['Confirm your available weekly hours alongside college classes.'],
        allowReapply: false,
        status: 'demo_approved',
        isVerified: false,
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth: RECENT_MONTHS[i % RECENT_MONTHS.length],
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const partRes = await commitInSafeChunks(
    partTimeWrites,
    'Writing 110 demo part-time jobs',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += partTimeWrites.length;
  allErrors.push(...partRes.errors);

  // 4. 110 Full-Time & Entry-Level Jobs
  const entryWrites: BatchWriteItem[] = [];
  for (let i = 0; i < ENTRY_LEVEL_COUNT; i++) {
    const template = ENTRY_LEVEL_ROLES[i % ENTRY_LEVEL_ROLES.length];
    const comp = FICTIONAL_COMPANIES[(i * 5 + 4) % FICTIONAL_COMPANIES.length];
    const loc = INDIAN_LOCATIONS[(i * 3 + 2) % INDIAN_LOCATIONS.length];
    const workMode: WorkMode = loc === 'Remote — India' ? 'remote' : WORK_MODES[(i + 2) % WORK_MODES.length];
    const lpaMin = Number((2.0 + ((i * 0.5) % 4.5)).toFixed(1));
    const lpaMax = Number(Math.min(8.0, lpaMin + 1.0 + ((i * 0.5) % 1.5)).toFixed(1));
    const monthlyMin = Math.round((lpaMin * 100000) / 12);
    const monthlyMax = Math.round((lpaMax * 100000) / 12);
    const oppId = `demo_job_${pad4(i + 1)}`;

    entryWrites.push({
      ref: doc(db, 'opportunities', oppId),
      data: {
        opportunityId: oppId,
        title: `${template.role} — Entry-Level (${loc.replace(' — India', '')})`,
        companyId: comp.id,
        companyName: comp.name,
        companyLogoUrl: '',
        industry: comp.industry,
        category: 'entry_level',
        subCategory: template.role,
        opportunityType: 'Full-Time / Entry-Level Job',
        description: `Synthetic entry-level full-time ${template.role} opportunity at ${comp.name}. Tailored for graduating final-year students and 0–1 year freshers building long-term career depth.`,
        responsibilities: [
          `Own core ${template.role.toLowerCase()} workflows under structured mentorship`,
          'Collaborate with regional stakeholders and maintain accurate KPI reporting',
          'Complete a structured 60-day graduate induction and domain review',
        ],
        requiredSkills: template.skills,
        eligibility: 'Final-year undergraduate or postgraduate students and fresh graduates (0–1 year).',
        educationQualification: template.edu,
        workMode,
        location: loc,
        isPaid: true,
        stipendMin: monthlyMin,
        stipendMax: monthlyMax,
        stipendLabel: `₹${lpaMin.toFixed(1)}–₹${lpaMax.toFixed(1)} LPA`,
        duration: 'Full-Time',
        openings: 1 + (i % 5),
        deadline: futureDateIso(7 + ((i * 3) % 60)),
        requiredDocuments: ['Updated Resume (PDF)', 'Latest Academic Transcript'],
        additionalQuestions: ['When are you available to start a full-time role?'],
        allowReapply: false,
        status: 'demo_approved',
        isVerified: false,
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth: RECENT_MONTHS[i % RECENT_MONTHS.length],
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const jobRes = await commitInSafeChunks(
    entryWrites,
    'Writing 110 demo entry-level jobs',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += entryWrites.length;
  allErrors.push(...jobRes.errors);

  // 5. 110 Live Projects (Mix of Paid & Unpaid)
  const projectDurations = ['3 Weeks', '4 Weeks', '6 Weeks', '8 Weeks'];
  const projectWrites: BatchWriteItem[] = [];
  for (let i = 0; i < LIVE_PROJECT_COUNT; i++) {
    const track = LIVE_PROJECT_TRACKS[i % LIVE_PROJECT_TRACKS.length];
    const comp = FICTIONAL_COMPANIES[(i * 4 + 8) % FICTIONAL_COMPANIES.length];
    const loc = INDIAN_LOCATIONS[(i * 2 + 5) % INDIAN_LOCATIONS.length];
    const workMode: WorkMode = i % 2 === 0 ? 'remote' : 'hybrid';
    const isPaid = i % 3 !== 0; // ~67% paid honorarium, ~33% unpaid mentored certificate
    const stipendMin = isPaid ? 2500 + ((i * 1000) % 7500) : 0;
    const stipendMax = isPaid ? stipendMin + 1500 : 0;
    const oppId = `demo_proj_${pad4(i + 1)}`;

    projectWrites.push({
      ref: doc(db, 'opportunities', oppId),
      data: {
        opportunityId: oppId,
        title: `Live Project: ${track.topic} (${comp.name.split(' ')[0]} Sprint #${(i % 9) + 1})`,
        companyId: comp.id,
        companyName: comp.name,
        companyLogoUrl: '',
        industry: comp.industry,
        category: 'live_project',
        subCategory: track.topic,
        opportunityType: 'Live Project',
        description: `Mentored industry live project on ${track.topic} hosted by ${comp.name}. Students deliver a complete portfolio-ready case artifact using ${track.skills.join(', ')}.`,
        responsibilities: [
          `Scope problem statements and gather clean datasets for ${track.topic}`,
          'Submit weekly milestone reviews and iterate on mentor feedback',
          'Present final project insights and receive a project completion letter',
        ],
        requiredSkills: track.skills,
        eligibility: 'College students looking for hands-on industry portfolio experience.',
        educationQualification: track.edu,
        workMode,
        location: workMode === 'remote' ? 'Remote — India' : loc,
        isPaid,
        stipendMin,
        stipendMax,
        stipendLabel: isPaid
          ? `${formatInr(stipendMin)}–${formatInr(stipendMax)} Honorarium`
          : 'Unpaid (Certificate & Portfolio)',
        duration: projectDurations[i % projectDurations.length],
        openings: 2 + (i % 10),
        deadline: futureDateIso(4 + ((i * 2) % 45)),
        requiredDocuments: ['Updated Resume (PDF)'],
        additionalQuestions: [`Share any coursework or tools you have used for ${track.topic}.`],
        allowReapply: false,
        status: 'demo_approved',
        isVerified: false,
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth: RECENT_MONTHS[i % RECENT_MONTHS.length],
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const projRes = await commitInSafeChunks(
    projectWrites,
    'Writing 110 demo live projects',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += projectWrites.length;
  allErrors.push(...projRes.errors);

  // 6. 105 Campus Events (Free & Paid Registration)
  const eventModes: EventMode[] = ['on_site', 'online', 'hybrid'];
  const eventTimes = [
    '10:00 AM - 1:00 PM IST',
    '11:00 AM - 2:00 PM IST',
    '2:30 PM - 5:00 PM IST',
    '4:00 PM - 6:30 PM IST',
    '6:00 PM - 8:00 PM IST',
  ];
  const eventWrites: BatchWriteItem[] = [];
  for (let i = 0; i < EVENT_COUNT; i++) {
    const track = EVENT_TRACKS[i % EVENT_TRACKS.length];
    const comp = FICTIONAL_COMPANIES[(i * 3 + 1) % FICTIONAL_COMPANIES.length];
    const loc = INDIAN_LOCATIONS[i % INDIAN_LOCATIONS.length];
    const mode: EventMode = loc === 'Remote — India' ? 'online' : eventModes[i % eventModes.length];
    const isPaid = i % 4 === 0;
    const feeAmount = 99 + (i % 5) * 100;
    const evtId = `demo_evt_${pad4(i + 1)}`;
    const daysAhead = 3 + ((i * 2) % 65);

    eventWrites.push({
      ref: doc(db, 'events', evtId),
      data: {
        eventId: evtId,
        title: `${track.titlePrefix} — ${loc.replace(' — India', '')} Edition #${Math.floor(i / EVENT_TRACKS.length) + 1}`,
        eventType: track.eventType,
        subCategory: track.subCategory,
        organizer: comp.name,
        description: `Synthetic demo ${track.subCategory.toLowerCase()} organized with ${comp.name} for college students. Features interactive Q&A, practical frameworks, and networking guidance.`,
        venue: mode === 'online' ? 'Virtual Auditorium' : `Academic Convention Center, ${loc}`,
        location: loc,
        mode,
        isPaid,
        feeLabel: isPaid ? `${formatInr(feeAmount)} Student Pass` : 'Free Registration',
        eventDate: futureDateIso(daysAhead),
        eventTime: eventTimes[i % eventTimes.length],
        registrationDeadline: futureDateIso(Math.max(1, daysAhead - 2)),
        capacity: 50 + (i % 8) * 25,
        registrationLink: '',
        bannerUrl: i % 2 === 0 ? CAMPUS_ASSETS.eventWorkshop : CAMPUS_ASSETS.liveProject,
        status: 'demo_approved',
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth: RECENT_MONTHS[i % RECENT_MONTHS.length],
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const evtRes = await commitInSafeChunks(
    eventWrites,
    'Writing 105 demo campus events',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += eventWrites.length;
  allErrors.push(...evtRes.errors);

  // 7. 105 Skill Development Programs (Stored in `skillDevelopment` AND mirrored in `opportunities` with category: 'skill_building')
  const skillDurations = ['2 Weeks', '3 Weeks', '4 Weeks', '6 Weeks', '8 Weeks'];
  const skillOppWrites: BatchWriteItem[] = [];
  const skillCollectionWrites: BatchWriteItem[] = [];

  for (let i = 0; i < SKILL_COUNT; i++) {
    const track = SKILL_TOPICS[i % SKILL_TOPICS.length];
    const comp = FICTIONAL_COMPANIES[(i * 2 + 10) % FICTIONAL_COMPANIES.length];
    const loc = INDIAN_LOCATIONS[(i * 3) % INDIAN_LOCATIONS.length];
    const workMode: WorkMode = i % 3 === 0 ? 'hybrid' : 'remote';
    const isPaid = i % 2 === 1;
    const fee = isPaid ? 499 + (i % 6) * 500 : 0;
    const feeLabel = isPaid ? `${formatInr(fee)} Program Fee` : 'Free Learning Program';
    const programId = `demo_skill_${pad4(i + 1)}`;
    const oppId = `demo_skill_opp_${pad4(i + 1)}`;
    const batchNo = Math.floor(i / SKILL_TOPICS.length) + 1;
    const duration = skillDurations[i % skillDurations.length];
    const deadline = futureDateIso(5 + ((i * 3) % 50));
    const createdMonth = RECENT_MONTHS[i % RECENT_MONTHS.length];
    const title = `${track.topic} Cohort (Batch ${batchNo} — ${track.level})`;
    const description = `Practical ${track.topic} skill-development program hosted by ${comp.name}. Includes guided assignments, real-world exercises in ${track.skills.join(', ')}, and peer review.`;

    skillOppWrites.push({
      ref: doc(db, 'opportunities', oppId),
      data: {
        opportunityId: oppId,
        title,
        companyId: comp.id,
        companyName: comp.name,
        companyLogoUrl: '',
        industry: comp.industry,
        category: 'skill_building',
        subCategory: track.topic,
        opportunityType: 'Skill Development',
        description,
        responsibilities: [
          `Complete weekly hands-on ${track.topic} lab worksheets`,
          'Build a capstone exercise demonstrating job-ready proficiency',
          'Attend live mentor doubt-clearing sessions',
        ],
        requiredSkills: track.skills,
        eligibility: `Open to all undergraduate and postgraduate students (${track.level}).`,
        educationQualification: 'Any Undergraduate / Postgraduate Student',
        workMode,
        location: workMode === 'remote' ? 'Remote — India' : loc,
        isPaid,
        stipendMin: 0,
        stipendMax: 0,
        stipendLabel: feeLabel,
        duration,
        openings: 25 + (i % 6) * 15,
        deadline,
        requiredDocuments: ['Student Email / Basic Profile'],
        additionalQuestions: [],
        allowReapply: false,
        status: 'demo_approved',
        isVerified: false,
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth,
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });

    skillCollectionWrites.push({
      ref: doc(db, 'skillDevelopment', programId),
      data: {
        programId,
        opportunityId: oppId,
        title,
        providerName: comp.name,
        companyId: comp.id,
        topic: track.topic,
        description,
        skills: track.skills,
        location: workMode === 'remote' ? 'Remote — India' : loc,
        workMode,
        isPaid,
        feeLabel,
        duration,
        deadline,
        level: track.level,
        status: 'demo_approved',
        isDemo: true,
        demoLabel: 'DEMO DATA',
        seedVersion: CURRENT_DEMO_SEED_VERSION,
        createdMonth,
        createdBy: safeAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const skillOppRes = await commitInSafeChunks(
    skillOppWrites,
    'Indexing 105 demo skill programs in marketplace',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += skillOppWrites.length;
  allErrors.push(...skillOppRes.errors);

  const skillColRes = await commitInSafeChunks(
    skillCollectionWrites,
    'Writing 105 demo skillDevelopment collection records',
    completedOps,
    totalOps,
    onProgress
  );
  completedOps += skillCollectionWrites.length;
  allErrors.push(...skillColRes.errors);

  const totalDemoRecords =
    INTERNSHIP_COUNT +
    PART_TIME_COUNT +
    ENTRY_LEVEL_COUNT +
    LIVE_PROJECT_COUNT +
    EVENT_COUNT +
    SKILL_COUNT;

  // Save seed metadata document
  await setDoc(doc(db, 'demoSeedMetadata', 'current'), {
    metaId: 'current',
    seedVersion: CURRENT_DEMO_SEED_VERSION,
    companiesCount: FICTIONAL_COMPANIES.length,
    internshipsCount: INTERNSHIP_COUNT,
    partTimeCount: PART_TIME_COUNT,
    entryLevelCount: ENTRY_LEVEL_COUNT,
    liveProjectsCount: LIVE_PROJECT_COUNT,
    eventsCount: EVENT_COUNT,
    skillProgramsCount: SKILL_COUNT,
    totalDemoRecords,
    generatedBy: safeAdmin,
    updatedAt: serverTimestamp(),
  });

  return {
    companiesCount: FICTIONAL_COMPANIES.length,
    internshipsCount: INTERNSHIP_COUNT,
    partTimeCount: PART_TIME_COUNT,
    entryLevelCount: ENTRY_LEVEL_COUNT,
    liveProjectsCount: LIVE_PROJECT_COUNT,
    eventsCount: EVENT_COUNT,
    skillProgramsCount: SKILL_COUNT,
    totalDemoRecords,
    seedVersion: CURRENT_DEMO_SEED_VERSION,
    lastUpdated: new Date().toLocaleString('en-IN'),
    errors: allErrors,
  };
}

export async function fetchDemoDatasetStats(): Promise<DemoDatasetStats> {
  const [metaSnap, demoOppsSnap, demoEventsCount, demoSkillsCount, demoCompaniesCount] =
    await Promise.all([
      getDoc(doc(db, 'demoSeedMetadata', 'current')).catch(() => null),
      getDocs(query(collection(db, 'opportunities'), where('isDemo', '==', true))),
      getCountFromServer(query(collection(db, 'events'), where('isDemo', '==', true))),
      getCountFromServer(query(collection(db, 'skillDevelopment'), where('isDemo', '==', true))),
      getCountFromServer(query(collection(db, 'companies'), where('isDemo', '==', true))),
    ]);

  let internshipsCount = 0;
  let partTimeCount = 0;
  let entryLevelCount = 0;
  let liveProjectsCount = 0;
  let skillOppsCount = 0;

  demoOppsSnap.forEach((docSnap) => {
    const cat = docSnap.data().category;
    if (cat === 'internship') internshipsCount++;
    else if (cat === 'part_time') partTimeCount++;
    else if (cat === 'entry_level') entryLevelCount++;
    else if (cat === 'live_project') liveProjectsCount++;
    else if (cat === 'skill_building') skillOppsCount++;
  });

  const eventsCount = demoEventsCount.data().count;
  const skillProgramsCount = Math.max(demoSkillsCount.data().count, skillOppsCount);
  const companiesCount = demoCompaniesCount.data().count;
  const totalDemoRecords =
    internshipsCount +
    partTimeCount +
    entryLevelCount +
    liveProjectsCount +
    eventsCount +
    skillProgramsCount;

  const meta = metaSnap && metaSnap.exists() ? (metaSnap.data() as DemoSeedMetadata) : null;

  return {
    companiesCount,
    internshipsCount,
    partTimeCount,
    entryLevelCount,
    liveProjectsCount,
    eventsCount,
    skillProgramsCount,
    totalDemoRecords,
    seedVersion: meta?.seedVersion ?? null,
    lastUpdated: meta?.updatedAt?.toDate ? meta.updatedAt.toDate().toLocaleString('en-IN') : null,
  };
}

/**
 * Deletes ONLY records explicitly marked `isDemo: true` across opportunities,
 * events, skillDevelopment, companies, and demoSeedMetadata.
 * NEVER touches real listings, student profiles, real applications, or real companies.
 */
export async function deleteOnlyDemoDataset(
  onProgress?: (progress: DemoGenerationProgress) => void
): Promise<{ deletedCount: number; errors: string[] }> {
  const collectionsToClean = ['opportunities', 'events', 'skillDevelopment', 'companies'] as const;
  const refsToDelete: DocumentReference[] = [];
  const errors: string[] = [];

  for (const colName of collectionsToClean) {
    const snap = await getDocs(query(collection(db, colName), where('isDemo', '==', true)));
    snap.forEach((d) => {
      if (d.data().isDemo === true) {
        refsToDelete.push(d.ref);
      }
    });
  }

  let deletedCount = 0;
  const totalOps = refsToDelete.length;

  for (let i = 0; i < refsToDelete.length; i += SAFE_BATCH_SIZE) {
    const chunk = refsToDelete.slice(i, i + SAFE_BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((r) => batch.delete(r));
    try {
      await batch.commit();
      deletedCount += chunk.length;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
    onProgress?.({
      phase: 'Deleting synthetic demo records (real user data untouched)',
      completedOps: Math.min(i + chunk.length, totalOps),
      totalOps: Math.max(1, totalOps),
      insertedRecords: deletedCount,
      errors: [...errors],
    });
  }

  await deleteDoc(doc(db, 'demoSeedMetadata', 'current')).catch(() => undefined);

  return { deletedCount, errors };
}

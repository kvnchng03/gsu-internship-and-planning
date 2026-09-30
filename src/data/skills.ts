// Accounting skills: how to spot them, what they mean, and where to learn them
import type { ClassRule, GuideInfo, Skill } from "../types";

export const SKILLS: Skill[] = [
  { id: "excel", name: "Excel", re: /\bexcel\b|spreadsheet/, tip: "Get comfortable with formulas, sorting and filtering. Many schools offer the Microsoft Office Specialist (MOS) Excel exam for free." },
  { id: "excel-adv", name: "Pivot tables & lookups", re: /pivot|\bv-?lookup|\bx-?lookup|index[\/ -]match|macros?\b|power query/, tip: "Take a messy CSV, clean it up, and summarize it with a pivot table and XLOOKUP. Put that small project on your resume." },
  { id: "gaap", name: "GAAP", re: /\bgaap\b|generally accepted accounting/, tip: "At GSU, ACCT 4101 and 4102 cover it. Once you're enrolled, list it on your resume as \"in progress\"." },
  { id: "fin-statements", name: "Financial statements", re: /financial statements?|balance sheet|income statement|cash flow statement|financial reporting/, tip: "Pick a public company's 10-K and trace how its three statements connect. It makes good interview material." },
  { id: "journal", name: "Journal entries & general ledger", re: /journal entr|general ledger|\bg\/l\b/, tip: "Practice adjusting and accrual entries (AccountingCoach.com has free drills)." },
  { id: "recon", name: "Account reconciliations", re: /reconcil/, tip: "Do a practice bank reconciliation and a balance-sheet account reconciliation. Interns do these all the time." },
  { id: "ap-ar", name: "Accounts payable / receivable", re: /accounts payable|accounts receivable|\ba\/[pr]\b|\bap\/ar\b/, tip: "A part-time bookkeeping or campus-office job usually covers AP/AR. Say so on your resume." },
  { id: "month-end", name: "Month-end close", re: /month[- ]end|close process|period[- ]end|financial close/, tip: "Learn the steps of a close (accruals, reconciliations, review) well enough to explain them in an interview." },
  { id: "audit", name: "Auditing", re: /\baudit/, tip: "ACCT 4610 covers it at GSU. Until then, the free Big 4 audit job simulations on Forage (theforage.com) are good resume lines." },
  { id: "controls", name: "Internal controls / SOX", re: /internal controls?|\bsox\b|sarbanes/, tip: "ACCT 4610 and ACCT 4310 cover it at GSU. The Forage audit simulations touch on it too." },
  { id: "tax", name: "Tax", re: /\btax/, tip: "ACCT 4510 covers individual tax at GSU. Volunteering with VITA, the IRS's free tax-prep program, also counts, and Tau Alpha Chi is GSU's tax student group." },
  { id: "cost", name: "Cost & managerial accounting", re: /cost accounting|managerial accounting|cost analysis|inventory costing|standard cost/, tip: "ACCT 4210 covers it at GSU. Be ready to explain a cost or variance you worked out in that class." },
  { id: "budget", name: "Budgeting & forecasting", re: /budget|forecast|variance analysis/, tip: "Build a simple 12-month budget-vs-actual in Excel for a club or a made-up business." },
  { id: "quickbooks", name: "QuickBooks", re: /quickbooks|\bqbo\b/, tip: "Intuit's ProAdvisor program offers a free QuickBooks Online certification." },
  { id: "erp", name: "ERP software (SAP, Oracle, NetSuite)", re: /\bsap\b|\boracle\b|netsuite|workday|\berp\b|dynamics 365|sage intacct/, tip: "Hard to learn on your own. ACCT 4310 may give you some exposure. On your resume, write \"exposure to\" rather than \"proficient\"." },
  { id: "analytics", name: "Data analytics (Power BI, Tableau, Alteryx)", re: /data analytic|tableau|power ?bi\b|alteryx|\bsql\b|\bpython\b/, tip: "Follow a free Tableau Public or Power BI tutorial and build one dashboard. That's enough to talk about in an interview." },
  { id: "office", name: "Microsoft Office", re: /microsoft office|ms office|office suite|powerpoint|outlook|microsoft 365/, tip: "Most students already have this. Just make sure it's on your resume." },
  { id: "cpa", name: "On track for CPA (150 credit hours)", re: /\bcpa\b|150[- ](credit|semester|hour)/, tip: "Plan your 150 credit hours with your advisor, and be ready to explain how you'll reach them." },
  { id: "communication", name: "Communication", re: /communicat|written and verbal|verbal and written|presentation skills/, tip: "Join Beta Alpha Psi or another GSU accounting group and take a role where you present or lead." },
  { id: "detail", name: "Attention to detail", re: /detail[- ]oriented|attention to detail|high degree of accuracy/, tip: "Hard to prove with a bullet point. Give an example, like catching an error in a reconciliation." },
  { id: "teamwork", name: "Teamwork", re: /teamwork|team player|collaborat|work(ing)? (well )?(in|with|on|as part of) (a )?team/, tip: "Group projects, a sports team or a club role all count. Name one in your resume or cover letter." },
  { id: "analytical", name: "Analytical & problem solving", re: /analytical|problem[- ]solving|critical thinking/, tip: "Have a short story ready about a problem you broke down and solved with numbers." },
  { id: "payroll", name: "Payroll", re: /payroll/, tip: "Payroll usually comes up in small-business or bookkeeping roles. QuickBooks training covers the basics." },
];
export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// Plain-language guide: what each skill is, how to tell if you have it, how to learn it
export const GUIDE_GROUPS: { name: string; ids: string[] }[] = [
  { name: "Accounting know-how", ids: ["journal", "fin-statements", "gaap", "recon", "ap-ar", "month-end", "cost", "budget", "tax", "audit", "controls", "cpa"] },
  { name: "Software and tools", ids: ["excel", "excel-adv", "quickbooks", "erp", "analytics", "office", "payroll"] },
  { name: "People skills", ids: ["communication", "detail", "teamwork", "analytical"] },
];
const AC = "https://www.accountingcoach.com/";
export const LINKS: Record<string, [label: string, url: string][]> = {
  journal: [["AccountingCoach: Debits and credits", AC + "debits-and-credits/explanation"], ["AccountingCoach: Adjusting entries", AC + "adjusting-entries/explanation"]],
  "fin-statements": [["AccountingCoach: Financial statements", AC + "financial-statements/explanation"], ["Khan Academy: Accounting and financial statements", "https://www.khanacademy.org/economics-finance-domain/core-finance/accounting-and-financial-stateme"], ["SEC EDGAR: find any company's 10-K", "https://www.sec.gov/edgar/search/"]],
  gaap: [["AccountingCoach: Accounting principles", AC + "accounting-principles/explanation"]],
  recon: [["AccountingCoach: Bank reconciliation", AC + "bank-reconciliation/explanation"]],
  "ap-ar": [["AccountingCoach: Accounts payable", AC + "accounts-payable/explanation"], ["AccountingCoach: Accounts receivable", AC + "accounts-receivable-and-bad-debts-expense/explanation"]],
  "month-end": [["AccountingCoach: Adjusting entries", AC + "adjusting-entries/explanation"], ["AccountingCoach: Bank reconciliation", AC + "bank-reconciliation/explanation"]],
  cost: [["AccountingCoach: Standard costing and variances", AC + "standard-costing/explanation"]],
  budget: [["AccountingCoach: Standard costing and variances", AC + "standard-costing/explanation"], ["Microsoft: Excel training", "https://support.microsoft.com/en-us/excel"]],
  tax: [["IRS: Volunteer with VITA", "https://www.irs.gov/individuals/irs-tax-volunteers"]],
  audit: [["Forage: free Big 4 job simulations", "https://www.theforage.com/"]],
  controls: [["Forage: free Big 4 job simulations", "https://www.theforage.com/"]],
  cpa: [["AICPA: This Way to CPA", "https://www.thiswaytocpa.com/"], ["GSU School of Accountancy", "https://robinson.gsu.edu/academic-departments/accountancy/"]],
  excel: [["GCFGlobal: Excel (free course)", "https://www.learnfree.org/series/excel-foundations"], ["Microsoft: Excel training", "https://support.microsoft.com/en-us/excel"]],
  "excel-adv": [["Exceljet: Pivot tables", "https://exceljet.net/articles/excel-pivot-tables"], ["Exceljet: XLOOKUP", "https://exceljet.net/functions/xlookup-function"]],
  quickbooks: [["Intuit: QuickBooks training and certification", "https://quickbooks.intuit.com/accountants/training-certification/"]],
  erp: [["SAP Learning (free courses)", "https://learning.sap.com/"]],
  analytics: [["Microsoft Learn: Power BI", "https://learn.microsoft.com/en-us/training/powerplatform/power-bi"], ["Power BI Desktop (free download)", "https://www.microsoft.com/en-us/power-platform/products/power-bi/desktop"], ["Tableau Public (free)", "https://public.tableau.com/"]],
  office: [["GCFGlobal: Word", "https://www.learnfree.org/series/word-foundations"], ["GCFGlobal: PowerPoint", "https://www.learnfree.org/series/powerpoint-foundations"]],
  payroll: [["AccountingCoach: Payroll accounting", AC + "payroll-accounting/explanation"], ["IRS: Publication 15 (Employer's Tax Guide)", "https://www.irs.gov/publications/p15"]],
  analytical: [["SEC EDGAR: find a 10-K to practice on", "https://www.sec.gov/edgar/search/"]],
};
export const GUIDE: Record<string, GuideInfo> = {
  journal: {
    what: "Recording every transaction as debits and credits in the company's books (the general ledger). Everything else in accounting is built on this.",
    check: "you can write the entries for a sale on credit, a prepaid expense, and an end-of-month accrual without looking them up.",
    learn: ["ACCT 2101 at GSU covers the basics.", "AccountingCoach.com has free lessons and quizzes on debits, credits and adjusting entries.", "Practice: write the entries for one month of a made-up small business."],
  },
  "fin-statements": {
    what: "The three main reports: the balance sheet (what a company owns and owes), the income statement (its profit), and the cash flow statement (where its cash came from and went).",
    check: "you can explain how net income on the income statement flows into the balance sheet and the cash flow statement.",
    learn: ["ACCT 2101, then ACCT 4101 at GSU.", "Khan Academy has free videos on reading financial statements.", "Read one real company's annual report (10-K), free on sec.gov."],
  },
  gaap: {
    what: "Generally Accepted Accounting Principles: the US rulebook for how companies record and report things, like when a sale counts as revenue.",
    check: "you can explain accrual accounting and the basic idea of revenue recognition, and why the rules exist.",
    learn: ["ACCT 4101 and 4102 at GSU are where this is really taught.", "AccountingCoach.com explains the core principles for free.", "Until you've taken ACCT 4101, don't list GAAP as a skill. Say \"coursework in progress\" instead."],
  },
  recon: {
    what: "Checking that two records agree, like the company's cash account and the bank statement, and explaining any difference.",
    check: "you can do a bank reconciliation: list outstanding checks and deposits in transit until both sides match.",
    learn: ["AccountingCoach.com has a free bank reconciliation lesson.", "Practice in Excel with a sample bank statement and checkbook.", "If your bookkeeping job included matching the books to the bank, you've done this. Put it on your resume."],
  },
  "ap-ar": {
    what: "Accounts payable (AP) is paying the company's bills from vendors. Accounts receivable (AR) is collecting what customers owe.",
    check: "you've entered, checked, or tracked vendor invoices or customer payments.",
    learn: ["Usually learned on the job. Tracking and checking vendor invoices is AP work.", "Learn the \"three-way match\": purchase order, receiving report, and invoice must agree before paying.", "QuickBooks training covers both sides."],
  },
  "month-end": {
    what: "The routine at the end of each month to finish the books: record accruals, reconcile accounts, review, then produce the financial statements.",
    check: "you can list the steps of a close and say why each one matters.",
    learn: ["Search \"month-end close checklist\" for real examples.", "Ask at work if you can shadow someone during a close.", "It builds on journal entries and reconciliations, so learn those first."],
  },
  cost: {
    what: "Working out what it costs to make a product or finish a project (materials, labor, overhead) and using that for decisions. Job costing is one kind.",
    check: "you can calculate a product's full cost including overhead, and explain why actual cost differed from the estimate.",
    learn: ["ACCT 2102 introduces it and ACCT 4210 goes deeper at GSU.", "Tracking project materials, change orders, and costs at work is job-costing experience. Call it that on your resume."],
  },
  budget: {
    what: "Planning future income and spending, then comparing what actually happened to the plan (variance analysis).",
    check: "you can build a simple budget in Excel and explain why the actual numbers came out different.",
    learn: ["Build a 12-month budget vs. actual sheet for a club or a made-up business.", "FI 3300 and ACCT 4210 at GSU touch on it."],
  },
  tax: {
    what: "Preparing tax returns and planning around tax law, for people or businesses.",
    check: "you can walk through the main parts of an individual Form 1040 and have helped prepare real returns.",
    learn: ["ACCT 4510 at GSU covers individual tax.", "Volunteer with the IRS's VITA program: free training, a certification, and real returns.", "Tau Alpha Chi is GSU's tax student group."],
  },
  audit: {
    what: "Independently checking that a company's financial statements are right by testing its records and evidence. Many Big 4 internships are in audit.",
    check: "you can explain what materiality and audit risk mean, and what testing a sample of transactions looks like.",
    learn: ["ACCT 4610 at GSU.", "Free Big 4 virtual job simulations on theforage.com let you try real audit tasks and add a line to your resume."],
  },
  controls: {
    what: "The checks a company uses to prevent mistakes and fraud, like needing a second person to approve an invoice before it's paid. SOX is the law that makes public companies test theirs.",
    check: "you can name a control and say what could go wrong without it.",
    learn: ["ACCT 4610 and ACCT 4310 at GSU.", "Checking invoices with the accounting department before they're processed is a control. If you do that at work, you have real examples."],
  },
  cpa: {
    what: "The Certified Public Accountant license. It takes education requirements, passing the four-part CPA exam, and work experience. Firms like to hear you're on track.",
    check: "you know which path you'll take to meet Georgia's education and experience requirements.",
    learn: ["Check the Georgia State Board of Accountancy's site. The rules have been changing, and some states now allow 120 credit hours plus extra work experience instead of 150 hours.", "Talk to a GSU School of Accountancy advisor about the Master of Professional Accountancy.", "The AICPA's thiswaytocpa.com explains the exam."],
  },
  excel: {
    what: "Spreadsheets: formulas, sorting, filtering, formatting, and basic charts. Almost every accounting posting asks for it.",
    check: "you can build a sheet with SUM and IF formulas, sort and filter data, and fix a formula that's giving the wrong answer.",
    learn: ["GCFGlobal.org has a free Excel course from the basics up.", "Microsoft's own Excel training videos are free.", "Many schools offer the Microsoft Office Specialist (MOS) Excel exam for free."],
  },
  "excel-adv": {
    what: "The Excel tools accountants use most: pivot tables to summarize lots of rows, and XLOOKUP or VLOOKUP to pull data from one sheet into another.",
    check: "given 500 transactions, you can total them by vendor with a pivot table in a few minutes.",
    learn: ["Exceljet.net has short free guides on pivot tables and XLOOKUP.", "Practice on real data, like a year of your own bank transactions.", "Once you can do it, write \"pivot tables, XLOOKUP\" on your resume, not just \"Excel.\""],
  },
  quickbooks: {
    what: "The most common accounting software for small businesses: bills, invoices, payroll, and reports.",
    check: "you've entered bills or invoices and run a report like a profit and loss in QuickBooks.",
    learn: ["Intuit offers a free QuickBooks Online certification through its ProAdvisor program for accountants.", "If you used it at a job, that counts. Say what you did in it."],
  },
  erp: {
    what: "The large systems big companies run on (SAP, Oracle, NetSuite, Workday). They connect accounting, purchasing and inventory.",
    check: "you've used one at work or in a class.",
    learn: ["SAP has free beginner courses at learning.sap.com.", "ACCT 4310 at GSU may give you some exposure.", "Nobody expects an intern to be an expert. \"Exposure to SAP\" is honest and enough."],
  },
  analytics: {
    what: "Using tools like Power BI, Tableau or Alteryx to find patterns in data and show them in dashboards. Firms want this more every year.",
    check: "you've built at least one dashboard from raw data.",
    learn: ["Power BI Desktop is free, with free lessons on Microsoft Learn.", "Tableau Public is free too.", "One small project, like a dashboard of a company's 10-K numbers, is enough to talk about in an interview."],
  },
  office: {
    what: "Word, PowerPoint and Outlook: clean documents, clear slides, and professional email.",
    check: "you can format a professional document, put together a simple slide deck, and manage email and a calendar.",
    learn: ["GCFGlobal.org has free courses on each one.", "Most students already have this. Just list it."],
  },
  payroll: {
    what: "Paying employees correctly: hours, tips, taxes taken out of paychecks, and the payroll tax filings that follow.",
    check: "you've run payroll or calculated what to withhold from a paycheck.",
    learn: ["The help centers for QuickBooks, Square Payroll and Gusto explain each step for free.", "The IRS's Publication 15 (Employer's Tax Guide) is the official reference.", "If you've run payroll at a job, you have it. Say how many employees and how often."],
  },
  communication: {
    what: "Writing clear emails, explaining numbers to people who aren't accountants, and presenting with confidence.",
    check: "you can explain a financial result in two minutes to someone with no accounting background.",
    learn: ["Class presentations count. So does emailing vendors and clients at work.", "Join Beta Alpha Psi or another GSU accounting group and take a role where you present or lead."],
  },
  detail: {
    what: "Catching small errors: a swapped number, the wrong account, a duplicate invoice.",
    check: "you have a real example of an error you caught before it caused a problem.",
    learn: ["Every posting says it, so prove it with a story instead of just listing it.", "Checking invoices or orders before they go through is a great example."],
  },
  teamwork: {
    what: "Working well with others on shared work. Audit and tax work is almost always done in teams.",
    check: "you have an example of a group project or job where you worked closely with others.",
    learn: ["Group projects, clubs and jobs all count.", "Prepare one short story: the situation, what you did, and how it turned out."],
  },
  analytical: {
    what: "Breaking a problem down and using numbers to reach a conclusion.",
    check: "you've analyzed data, like financial ratios, and explained what the results mean.",
    learn: ["Practice explaining what ratios mean, not just calculating them.", "A class project like a 10-K ratio analysis is a strong example. Put it on your resume."],
  },
};

// Other classes typed by hand -> skills they count toward
export const CLASS_MAP: ClassRule[] = [
  { re: /principles of (financial )?accounting|intro(duction)? to (financial )?accounting|financial accounting|accounting principles/, yes: ["journal", "fin-statements"] },
  { re: /intermediate/, yes: ["gaap", "fin-statements", "journal", "recon"] },
  { re: /advanced accounting/, yes: ["gaap", "fin-statements"] },
  { re: /audit/, yes: ["audit", "controls"] },
  { re: /\btax/, yes: ["tax"] },
  { re: /cost accounting|managerial/, yes: ["cost", "budget"] },
  { re: /information systems|\bais\b/, yes: ["controls"], partly: ["erp"] },
  { re: /excel|spreadsheet|business computing|computer applications/, yes: ["excel", "office"] },
  { re: /analytics|data/, yes: ["analytics"] },
  { re: /business communication|business writing|public speaking/, yes: ["communication"] },
  { re: /finance|financial management/, partly: ["budget"] },
];

/** Each skill's category name, and its color key: accounting, software, or people. */
export const CATEGORY: Record<string, string> = {};
export const CAT_KEY: Record<string, string> = {};
GUIDE_GROUPS.forEach((g, i) => { for (const id of g.ids) { CATEGORY[id] = g.name; CAT_KEY[id] = ["acct", "soft", "people"][i]; } });

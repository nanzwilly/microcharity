export const site = {
  name: "MicroCharity",
  tagline: "Micro contributions towards Mighty Changes",
  registration: "KEN-4-00113-2010-11",
  established: 2010,
  email: "info@microcharity.com",
  phone: "+91 80 26780415",
  address: "112, West Village, Kodipalya, Kengeri, Bangalore – 560060, India",
  totalRaised: "₹1,61,12,720",
  totalDonations: "4,505",
  social: {
    facebook: "https://www.facebook.com/microcharity",
    twitter: "https://twitter.com/microcharity",
    youtube: "",
  },
  nav: [
    { label: "Who We Are",     href: "/who-we-are/" },
    { label: "How We Work",    href: "/how-we-work/" },
    { label: "Current Causes", href: "/current-causes/" },
    { label: "Refer a Cause",  href: "/refer-a-cause/" },
    { label: "Financials",     href: "/legal-financial/" },
    { label: "Contact",        href: "/contact-us/" },
  ],
  focusAreas: [
    { title: "Education",           desc: "School & college fees, books, uniforms for deserving students." },
    { title: "Medical Emergencies", desc: "Surgeries, transplants, and treatment for those who can't afford it." },
    { title: "Child Health",        desc: "Care, nutrition, and life-saving support for young children." },
    { title: "Women Empowerment",   desc: "Helping women set up small businesses and become self-reliant." },
    { title: "Environment",         desc: "Tree plantation drives and community sustainability projects." },
  ],
};

// Causes are scraped from the live site — see src/data/causes.ts.
// Legacy hardcoded list retained below for reference only; not imported anywhere.
type _LegacyCause = {
  slug: string;
  title: string;
  beneficiary: string;
  category: string;
  summary: string;
  story?: string;
  goal: number;
  raised: number;
  deadline?: string;
  status: "active" | "closed";
};

const _legacy: _LegacyCause[] = [
  {
    slug: "nursing-fee-catherin-anna-roby-2026",
    title: "Nursing College Fee for Catherin Anna Roby",
    beneficiary: "Catherin Anna Roby",
    category: "Education",
    summary: "Help Catherin continue her nursing education and complete her final-year studies.",
    story: "Catherin is a determined young woman from a financially struggling family. With your help, she will complete her final-year nursing degree and begin her career in healthcare.",
    goal: 100000,
    raised: 42500,
    deadline: "2026-08-30",
    status: "active",
  },
  {
    slug: "nursing-jhumuli-montry-sep-2025",
    title: "Nursing Education for Jhumuli Montry",
    beneficiary: "Jhumuli Montry",
    category: "Education",
    summary: "Support Jhumuli's nursing course fees so she can build a career in healthcare.",
    story: "Jhumuli comes from a tribal community in Assam. Her dream is to serve her village as a qualified nurse, and your contribution will pay her course fees this year.",
    goal: 80000,
    raised: 31000,
    deadline: "2026-07-15",
    status: "active",
  },
  {
    slug: "college-fee-christo-july-2025",
    title: "Nursing College Fee for Christo",
    beneficiary: "Christo",
    category: "Education",
    summary: "Christo is a meritorious student who needs help paying his college fees this term.",
    story: "Christo lost his father last year. Despite the hardship he scored well in his entrance exam. The full course fee is beyond his family's means.",
    goal: 90000,
    raised: 56500,
    deadline: "2026-06-30",
    status: "active",
  },
  {
    slug: "kidney-transplant-madhu",
    title: "Kidney Transplant for Madhu",
    beneficiary: "Madhu",
    category: "Medical",
    summary: "Madhu urgently needs a kidney transplant. Hospital costs are far beyond his family's means.",
    goal: 250000,
    raised: 178000,
    deadline: "2026-06-15",
    status: "active",
  },
  {
    slug: "support-thomas-build-house",
    title: "Help Thomas Build a Home for His Family",
    beneficiary: "Thomas",
    category: "Women Empowerment",
    summary: "Thomas's family of four lives in a single-room shelter that floods during monsoons.",
    goal: 200000,
    raised: 95000,
    deadline: "2026-09-30",
    status: "active",
  },
  {
    slug: "school-fee-tribal-children-assam",
    title: "School Fees for Tribal Children of Assam",
    beneficiary: "Children of Santal community",
    category: "Education",
    summary: "Annual school fees and supplies for 12 children in a tribal hamlet of Assam.",
    goal: 60000,
    raised: 60000,
    deadline: "2024-06-01",
    status: "closed",
  },
];

void _legacy;

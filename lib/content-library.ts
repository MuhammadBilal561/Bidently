import type { ContentLibraryItem } from "./types";

// Default starter content, copied into a new organization's library at
// signup time (see app/api/auth/signup/route.ts). After that, each org's
// library lives in the database and is independently editable — this array
// is just the day-one seed, not the runtime source of truth.

export const SEED_CONTENT_LIBRARY: Omit<ContentLibraryItem, "id">[] = [
  {
    title: "ISO 27001 & Manufacturer Certifications",
    category: "legal",
    tags: ["certification", "ISO", "authorization", "OEM"],
    body: "Our firm holds current ISO/IEC 27001:2022 certification for information security management, renewed annually through an accredited third-party auditor. We are an authorized reseller for all major network security OEMs we bid with, and can produce a manufacturer authorization letter dated within 30 days of any bid submission upon request.",
  },
  {
    title: "NGFW Deployment Case Study — National Telecom Client",
    category: "technical",
    tags: ["firewall", "NGFW", "deployment", "case study", "throughput"],
    body: "In 2025 we delivered a next-generation firewall rollout for a national telecom operator across 40 sites, achieving sustained 12 Gbps inspected throughput with zero unplanned downtime during migration. The deployment included Deep Packet Inspection policy tuning and a phased cutover plan that kept the client's existing infrastructure live throughout.",
  },
  {
    title: "Standard Warranty & Support Terms",
    category: "technical",
    tags: ["warranty", "support", "SLA", "next business day"],
    body: "All hardware we supply carries a minimum three-year comprehensive warranty as standard, with next-business-day replacement available in-country through our regional logistics partners. We also offer an optional extended five-year support tier with 4-hour response for mission-critical deployments.",
  },
  {
    title: "Corporate Registration & Compliance Statement",
    category: "administrative",
    tags: ["blacklist", "registration", "affidavit", "eligibility"],
    body: "Our company is in good standing with all relevant tax and regulatory authorities, is not currently blacklisted or debarred by any government, semi-government, or multilateral body, and maintains notarized compliance affidavits on file that can be issued for any bid within 48 hours.",
  },
  {
    title: "Past Performance & Reference List",
    category: "administrative",
    tags: ["references", "past performance", "government", "clients"],
    body: "Over the last five years we have completed 14 similar equipment supply contracts for government and regulated-sector clients, including three federal agencies. Full reference contacts, delivery timelines, and performance certificates are available on request and are typically included as an annex to our technical proposal.",
  },
];

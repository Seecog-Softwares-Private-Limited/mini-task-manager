/**
 * The seven industry editions from ui-screens/latest/OpsPick Live Demo.html.
 * Same app and backend for every industry — this changes only the words a
 * workspace sees (e.g. "Outlet" vs "Site" vs "Ward") and the category it's
 * grouped under for billing/reporting. Pricing, seed checklists and sample
 * people from the demo are out of scope for this phase.
 */

export const INDUSTRY_KEYS = [
  'restaurant',
  'construction',
  'hospital',
  'school',
  'fm',
  'hotel',
  'general',
] as const;

export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

export interface IndustryWords {
  /** Singular/plural for the unit a project represents (an outlet, a ward, a site). */
  site: string;
  sites: string;
  /** Singular/plural for a reported problem (an issue, a snag, a ticket, a bug). */
  issue: string;
  issues: string;
  /** Name of the compliance/evidence export for this industry. */
  report: string;
}

export interface IndustryPack {
  key: IndustryKey;
  label: string;
  description: string;
  words: IndustryWords;
}

export const INDUSTRY_PACKS: Record<IndustryKey, IndustryPack> = {
  restaurant: {
    key: 'restaurant',
    label: 'Restaurant',
    description: 'Outlets, kitchens, cloud kitchens',
    words: { site: 'Outlet', sites: 'Outlets', issue: 'Issue', issues: 'Issues', report: 'FSSAI hygiene log' },
  },
  construction: {
    key: 'construction',
    label: 'Construction',
    description: 'Builders, real estate, contractors',
    words: { site: 'Site', sites: 'Sites', issue: 'Snag', issues: 'Snags', report: 'RERA progress evidence' },
  },
  hospital: {
    key: 'hospital',
    label: 'Hospital',
    description: 'Hospitals, nursing homes, clinics',
    words: { site: 'Area', sites: 'Areas', issue: 'Ticket', issues: 'Tickets', report: 'NABH evidence pack' },
  },
  school: {
    key: 'school',
    label: 'School',
    description: 'Schools, colleges, hostels',
    words: { site: 'Area', sites: 'Areas', issue: 'Issue', issues: 'Issues', report: 'Inspection evidence' },
  },
  fm: {
    key: 'fm',
    label: 'Facility management',
    description: 'Housekeeping, security, technical',
    words: { site: 'Client site', sites: 'Client sites', issue: 'Complaint', issues: 'Complaints', report: 'Client SLA report' },
  },
  hotel: {
    key: 'hotel',
    label: 'Hotel',
    description: 'Hotels, resorts, service apartments',
    words: { site: 'Area', sites: 'Areas', issue: 'Request', issues: 'Requests', report: 'Brand standards audit' },
  },
  general: {
    key: 'general',
    label: 'General team / IT',
    description: 'IT teams, agencies, any office team',
    words: { site: 'Team', sites: 'Teams', issue: 'Bug', issues: 'Bugs', report: 'Delivery report' },
  },
};

export function isIndustryKey(value: unknown): value is IndustryKey {
  return typeof value === 'string' && (INDUSTRY_KEYS as readonly string[]).includes(value);
}

/** Falls back to the General edition's words for workspaces with no (or an unknown) industry. */
export function resolveIndustryWords(industry: string | null | undefined): IndustryWords {
  if (isIndustryKey(industry)) return INDUSTRY_PACKS[industry].words;
  return INDUSTRY_PACKS.general.words;
}

export function listIndustryPacks(): IndustryPack[] {
  return INDUSTRY_KEYS.map((k) => INDUSTRY_PACKS[k]);
}

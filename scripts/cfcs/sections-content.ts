/**
 * Shared checklist content for Case File Cover Sheet (Routine + Major Crime).
 * Keep in sync with agency filing standards; both docx templates read this module.
 */

export const CFCS_EXTRA_BLANK_LINES_PER_SECTION = 3

export type CfcsSection = {
  /** 1–8 */
  number: number
  title: string
  /** One line per ☐ row (no leading checkbox — the generator adds it). */
  items: string[]
}

export const CFCS_SECTIONS: readonly CfcsSection[] = [
  {
    number: 1,
    title: 'Initial Response',
    items: [
      'CAD Report',
      'Incident Report',
      'Detective Case Notes',
      'Investigative Supplement',
      'Supplemental reports / narrative addenda (as applicable)',
    ],
  },
  {
    number: 2,
    title: 'Crime Scene Investigation',
    items: [
      'Crime scene photos',
      'Sketch (crime scene SW/sub as applicable)',
      'Evidence and property receipt',
      'Scene log',
      'Scene report',
      'Scene notes (e.g. tow sheets)',
    ],
  },
  {
    number: 3,
    title: 'Victim(s) Information',
    items: [
      'Victim info',
      'Victim photographs, DL photos',
      'Victimology',
      'Recordings/interviews, sketches',
      'Anything relevant to the victim',
      'Autopsy report',
      'DCS referral',
    ],
  },
  {
    number: 4,
    title: 'Witness(s) Information',
    items: [
      'Contact information',
      'Statements',
      'Witness photographs, DL photos',
      'Crime Stoppers / hotline tips',
      'Recordings, sketches, anything related to witnesses',
    ],
  },
  {
    number: 5,
    title: 'Suspect(s) Information',
    items: [
      'Suspect photo, DL photos',
      'Suspect information',
      'Criminal history',
      'Statements',
      'Recordings/interviews',
      'Anything related to the suspect',
    ],
  },
  {
    number: 6,
    title: 'Arrest',
    items: ['Warrants/indictments', 'Book-in sheets/information', 'Arrest report'],
  },
  {
    number: 7,
    title: 'Investigative Data',
    items: [
      'TBI request form',
      'TBI lab report',
      'Media, BOLOs, press releases',
      'Digital media reports (e.g. social, carrier records)',
      'Search warrants',
      'Subpoenas',
      'Returns',
      'Preservation requests',
      'Emergency requests',
      'Body-worn cameras (all involved, including SWAT)',
      'Other agency body cams, reports',
    ],
  },
  {
    number: 8,
    title: 'Miscellaneous',
    items: ['Other materials not listed above (catch-all)'],
  },
] as const

export function leftColumnSections(): readonly CfcsSection[] {
  return CFCS_SECTIONS.filter((s) => s.number <= 4)
}

export function rightColumnSections(): readonly CfcsSection[] {
  return CFCS_SECTIONS.filter((s) => s.number >= 5)
}

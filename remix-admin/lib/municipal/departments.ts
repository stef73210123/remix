/**
 * Departmental contacts shown atop board pages — the staff a resident actually
 * deals with for each body's business (the Building Department page has its own
 * richer DepartmentInfo in permits.ts; this is the lighter per-board variant).
 *
 * Facts from the Town of North Castle staff directory / department pages.
 */

export interface DeptContact {
  department: string
  /** Omitted for offices whose current officeholder isn't reliably confirmed
   *  (e.g. an elected position that turns over) — the card falls back to the
   *  title/department alone rather than risk publishing a stale name. */
  person?: string
  title: string
  phone?: string
  email?: string
  address?: string
  blurb: string
  links: { label: string; href: string }[]
}

// Outside counsel, not Town Hall staff — Baroni's firm has handled North
// Castle's town attorney work since 1982 (Stephens, Baroni, Reilly & Lewis,
// now folded into Abrams Fensterman, LLP), advising both the Town Board and
// the Planning Board he staffs on land use, zoning, and environmental
// matters. No Town Hall phone/email of his own to list, unlike the W-2
// department contacts below — the professional-profile link is the
// verifiable public source instead.
const TOWN_ATTORNEY: DeptContact = {
  department: 'Town Attorney',
  person: 'Roland A. Baroni, Jr.',
  title: 'Town Attorney',
  email: 'rbaroni@abramslaw.com',
  blurb:
    'Outside counsel who has served as North Castle’s Town Attorney since 1982, advising the Town ' +
    'Board and Planning Board on land use, zoning, and environmental law.',
  links: [{ label: 'Attorney profile', href: 'https://www.abramslaw.com/attorneys/roland-baroni/' }],
}

const NC_BOARD_DEPARTMENTS: Record<string, DeptContact[]> = {
  planning: [
    {
      department: 'Director of Planning',
      person: 'Adam R. Kaufman, AICP',
      title: 'Director of Planning',
      phone: '(914) 273-3542',
      address: '17 Bedford Road, Armonk, NY 10504',
      blurb:
        'Advises the Town on its physical development — oversees the municipal planning operation, ' +
        'staffs the Planning Board, and performs the planning studies behind the Town master plan.',
      links: [
        { label: 'Planning Department', href: 'https://www.northcastleny.com/197/Planning-Department' },
        { label: 'Staff directory', href: 'https://www.northcastleny.com/directory.aspx?EID=34' },
      ],
    },
    TOWN_ATTORNEY,
  ],
  town_board: [
    {
      department: 'Town Clerk',
      person: 'Alison Simon',
      title: 'Town Clerk',
      phone: '(914) 273-3000 ext. 42',
      email: 'asimon@northcastleny.com',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb:
        'Keeper of the Town record — minutes, adopted laws, budgets, contracts and deeds — and the ' +
        'Records Access Officer who answers FOIL requests and general inquiries.',
      links: [
        { label: 'Town Clerk', href: 'https://www.northcastleny.gov/597/Town-Clerk' },
        { label: 'FOIL information', href: 'https://www.northcastleny.com/603/FOIL-Form-Information' },
      ],
    },
    {
      department: 'Town Administrator',
      person: 'Kevin Hay',
      title: 'Town Administrator',
      phone: '(914) 273-3000 ext. 52',
      email: 'khay@northcastleny.com',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb:
        'The Town’s chief administrative officer — implements Town Board policy, coordinates the ' +
        'departments day to day, and manages operations between board meetings.',
      links: [{ label: 'Town Administrator', href: 'https://www.northcastleny.com/596/Town-Administrator' }],
    },
    TOWN_ATTORNEY,
  ],
  finance: [
    {
      department: 'Director of Finance',
      person: 'Abbas Sura',
      title: 'Director of Finance',
      phone: '(914) 273-3000 ext. 48',
      email: 'asura@northcastleny.com',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb:
        'Manages the Town’s finances — budget preparation and monitoring, accounting, payroll, ' +
        'debt service and financial reporting behind the annual budget the Town Board adopts.',
      links: [{ label: 'Finance Department', href: 'https://www.northcastleny.com/158/Finance-Department' }],
    },
  ],
  building: [
    {
      department: 'Building / Fire Inspector',
      person: 'Robert Melillo',
      title: 'Building / Fire Inspector',
      phone: '(914) 273-3000 ext. 44',
      email: 'building@northcastleny.com',
      address: '17 Bedford Road, Armonk, NY 10504',
      blurb:
        'Safeguards life, health, property and public welfare by administering and enforcing the NYS ' +
        'Uniform Fire Prevention and Building Code and the Town’s adopted laws for all construction in North Castle.',
      links: [
        { label: 'Building & Engineering', href: 'https://www.northcastleny.com/180/Building-Engineering' },
        { label: 'Permit process guide', href: 'https://www.northcastleny.com/213/Customers-Guide-to-the-Building-Permit-P' },
        { label: 'Online permitting', href: 'https://www.northcastleny.com/218/Online-Permitting' },
      ],
    },
  ],
  parks_rec: [
    {
      department: 'Superintendent of Parks and Recreation',
      person: 'Matt Trainor',
      title: 'Superintendent of Parks and Recreation',
      phone: '(914) 273-3000 ext. 301',
      email: 'mtrainor@northcastleny.com',
      address: '40 Maple Avenue, Hergenhan Community Center, Armonk, NY 10504',
      blurb:
        'Runs the Town’s parks and playing fields and the Hergenhan Community Center, and organizes youth, ' +
        'adult, and senior recreation programs.',
      links: [{ label: 'Parks & Recreation Department', href: 'https://www.northcastleny.com/189/Recreation-Parks-Department' }],
    },
  ],
  // Chief of Police is the key staff member for this page — same convention
  // as every other card here (eyebrow/title is the role, not the department
  // at large). Regen Hufnagle was unanimously appointed Chief at the 1/28/26
  // Town Board meeting, succeeding Peter Simonsen (whose retirement walkout
  // was scheduled Dec 2025) — confirmed via the department's own staff
  // directory, not the earlier unconfirmed-name placeholder.
  police: [
    {
      department: 'Chief of Police',
      person: 'Regen Hufnagle',
      title: 'Chief of Police',
      phone: '(914) 273-3000',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb:
        'Leads North Castle’s police department — patrol, emergency response, and community policing for ' +
        'Armonk, Banksville, and North White Plains. Appointed Chief in January 2026.',
      links: [{ label: 'Police Department', href: 'https://www.northcastleny.com/229/Police-Department' }],
    },
    {
      department: 'Secretary / Records',
      person: 'Kathy Giaccio',
      title: 'Secretary / Records',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb: 'Handles departmental records and administrative support for the Police Department.',
      links: [{ label: 'Police Department', href: 'https://www.northcastleny.com/229/Police-Department' }],
    },
    {
      department: 'Animal Warden / Parking Enforcement Officer',
      person: 'Mary Madsen',
      title: 'Animal Warden / Parking Enforcement Officer',
      phone: '(914) 273-3000 ext. 231',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb: 'Handles animal control matters and parking enforcement for the Town.',
      links: [{ label: 'Police Department', href: 'https://www.northcastleny.com/229/Police-Department' }],
    },
  ],
  highway: [
    {
      department: 'Highway General Foreman',
      person: 'Jamie Norris',
      title: 'Highway General Foreman',
      phone: '(914) 273-3000 ext. 45',
      email: 'highway@northcastleny.com',
      address: '17 Bedford Road, Armonk, NY 10504',
      blurb:
        'Maintains and repairs Town roads and storm drainage and services the Town’s vehicles and equipment; ' +
        'handles snow and ice control in winter.',
      links: [{ label: 'Highway Department', href: 'https://www.northcastleny.com/161/Highway-Department' }],
    },
  ],
  // Assessor's office — distinct from the Receiver of Taxes (who collects
  // already-levied bills) and previously mislabeled as such on this page.
  // This is also where the Top 50 Taxpayers schedule lives (it's drawn from
  // the Assessor's own Tentative Assessment Roll) — see BoardKeyDocs / the
  // Top 50 Taxpayers section on the Assessor page.
  assessor: [
    {
      department: 'Assessor',
      person: 'Georgann Richardson',
      title: 'Assessor',
      phone: '(914) 273-3000 ext. 47',
      email: 'assessor@northcastleny.com',
      address: '17 Bedford Road, Armonk, NY 10504',
      blurb:
        'Determines the assessed value of every property in Town for tax purposes, maintains the annual ' +
        'assessment roll, and administers property-tax exemptions (STAR, senior, veterans, and others).',
      links: [{ label: 'Assessor', href: 'https://www.northcastleny.com/157/Assessor' }],
    },
  ],
  water_sewer: [
    {
      department: 'Director of Water & Sewer Operations',
      person: 'Sal Misiti',
      title: 'Director of Water & Sewer Operations',
      phone: '(914) 273-3000 ext. 55',
      email: 'smisiti@northcastleny.com',
      address: '15 Business Park Drive, Armonk, NY 10504',
      blurb:
        'Operates and maintains the Town’s water distribution and sanitary sewer systems across North ' +
        'Castle’s water and sewer districts.',
      links: [{ label: 'Water & Sewer Department', href: 'https://www.northcastleny.com/636/Water-Sewer' }],
    },
  ],
}

const BOARD_DEPARTMENTS: Record<string, Record<string, DeptContact[]>> = {
  nc: NC_BOARD_DEPARTMENTS,
}

/** Departmental contacts for a board page, or [] when none configured. */
export function getBoardDepartments(muniKey: string, bodyKey: string): DeptContact[] {
  return BOARD_DEPARTMENTS[muniKey]?.[bodyKey] ?? []
}

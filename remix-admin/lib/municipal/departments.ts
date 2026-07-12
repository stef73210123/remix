/**
 * Departmental contacts shown atop board pages — the staff a resident actually
 * deals with for each body's business (the Building Department page has its own
 * richer DepartmentInfo in permits.ts; this is the lighter per-board variant).
 *
 * Facts from the Town of North Castle staff directory / department pages.
 */

export interface DeptContact {
  department: string
  person: string
  title: string
  phone?: string
  email?: string
  address?: string
  blurb: string
  links: { label: string; href: string }[]
}

const NC_BOARD_DEPARTMENTS: Record<string, DeptContact[]> = {
  planning: [
    {
      department: 'Planning Department',
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
  ],
  town_board: [
    {
      department: 'Town Clerk',
      person: 'Alison Simon',
      title: 'Town Clerk',
      phone: '(914) 273-3321',
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
      phone: '(914) 273-3000',
      email: 'khay@northcastleny.com',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb:
        'The Town’s chief administrative officer — implements Town Board policy, coordinates the ' +
        'departments day to day, and manages operations between board meetings.',
      links: [{ label: 'Town Administrator', href: 'https://www.northcastleny.com/596/Town-Administrator' }],
    },
    {
      department: 'Finance Department',
      person: 'Abbas Sura',
      title: 'Director of Finance',
      phone: '(914) 273-3000',
      address: '15 Bedford Road, Armonk, NY 10504',
      blurb:
        'Manages the Town’s finances — budget preparation and monitoring, accounting, payroll, ' +
        'debt service and financial reporting behind the annual budget the Town Board adopts.',
      links: [{ label: 'Finance Department', href: 'https://www.northcastleny.com/158/Finance-Department' }],
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

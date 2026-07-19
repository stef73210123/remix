import type { PermitMarker } from '@/app/admin/municipal/JurisdictionMap'

// Green = a Parks & Recreation-run park/facility; blue sets the Town Pool
// apart as its own distinct amenity, the way the codebase's other categorical
// map layers (e.g. water vs. sewer districts) use one hue per entity kind.
const PARK_COLOR = '#3d9c72'
const POOL_COLOR = '#2a78d6'

/** North Castle's Parks & Recreation-run parks and facilities, plus the Town
 *  Pool — addresses/descriptions sourced from the Town's own Parks &
 *  Facilities and Pool pages (northcastleny.gov/194, /195), geocoded on
 *  demand the same way the Building Department's permit map geocodes
 *  addresses. A few entries (Miller Park, Cat Rocks Park, Winkler Park) have
 *  no street address on the Town's site — geocoded by name or hamlet center
 *  instead, so they land approximately rather than at an exact point. */
export const NC_PARKS: PermitMarker[] = [
  {
    id: 'nc-community-park',
    title: 'North Castle Community Park',
    address: '205 Business Park Drive, Armonk, NY',
    sub: '23 acres · walking/running track, tennis, soccer & baseball fields, playground, picnic pavilion',
    color: PARK_COLOR,
  },
  {
    id: 'wampus-brook-park',
    title: 'Wampus Brook Park',
    address: 'Maple Avenue, Armonk, NY',
    sub: 'Gazebo bandstand, brook, waterfowl, quiet sitting areas',
    color: PARK_COLOR,
  },
  {
    id: 'betsy-sluder-nature-preserve',
    title: 'Betsy Sluder Nature Preserve',
    address: 'Old Route 22, Armonk, NY',
    sub: '70-acre conservancy · hiking, bird watching, nature observation',
    color: PARK_COLOR,
  },
  {
    id: 'straus-park',
    title: 'Straus Park',
    address: 'Old Orchard Road, Armonk, NY',
    sub: 'Grass play area · Quarry Heights',
    color: PARK_COLOR,
  },
  {
    id: 'miller-park',
    title: 'Miller Park',
    address: 'Miller Park, North Castle, NY',
    sub: 'Quiet sitting area',
    color: PARK_COLOR,
  },
  {
    id: 'legion-field',
    title: 'Legion Field',
    address: 'Bedford Road, Armonk, NY',
    sub: 'Softball diamond',
    color: PARK_COLOR,
  },
  {
    id: 'clove-road-park',
    title: 'Clove Road Park',
    address: 'Clove Road, North White Plains, NY',
    sub: 'Community center, playground, multi-purpose field, Little League field',
    color: PARK_COLOR,
  },
  {
    id: 'john-a-lombardi-park',
    title: 'John A. Lombardi Park (Town Park)',
    address: '85 Cox Avenue, Armonk, NY',
    sub: '3 baseball fields incl. Clark Field, 4 tennis courts, playground, picnic pavilion, 2 basketball courts',
    color: PARK_COLOR,
  },
  {
    id: 'cat-rocks-park',
    title: 'Cat Rocks Park',
    address: 'Cat Rocks Park, North Castle, NY',
    sub: 'Nature conservancy',
    color: PARK_COLOR,
  },
  {
    id: 'johnson-tract',
    title: 'Johnson Tract',
    address: 'North Greenwich Road, Armonk, NY',
    sub: 'Wooded area',
    color: PARK_COLOR,
  },
  {
    id: 'fountains-park',
    title: 'Fountains Park',
    address: 'Hillandale Avenue, North White Plains, NY',
    sub: 'Wooded area',
    color: PARK_COLOR,
  },
  {
    id: 'quarry-park',
    title: 'Quarry Park',
    address: 'Old Orchard Road, Armonk, NY',
    sub: 'Playground, grass play area · Quarry Heights',
    color: PARK_COLOR,
  },
  {
    id: 'winkler-park',
    title: 'Winkler Park',
    address: 'Banksville, NY',
    sub: '2 DecoTurf tennis courts, basketball court, gazebo · off Greenwich Banksville Road (approximate — hamlet center)',
    color: PARK_COLOR,
  },
  {
    id: 'town-pool',
    title: 'North Castle Town Pool',
    address: '3 Greenway Road, Armonk, NY',
    sub: 'Town Pool · open Memorial Day weekend through Labor Day weekend',
    color: POOL_COLOR,
  },
]

import type { PermitMarker } from '@/app/admin/municipal/JurisdictionMap'

const PARKING_COLOR = '#f59e0b'

/** North Castle's downtown Armonk public parking lots, per the Town's
 *  Nelson\Nygaard Armonk Hamlet Parking Study (the study found aggregate
 *  downtown supply adequate but unevenly distributed — excess on Old Route
 *  22, shortage near Main Street at peak times) and the parking-district
 *  work that followed it: the Kent Place lot's Whippoorwill Road East
 *  expansion (approved by the Planning Board in 2024, built on former
 *  Verizon/municipal land). Not every lot's exact space count is published
 *  by the Town — those are labeled accordingly rather than guessed. The
 *  Town's other public lot, the Fisher Lane commuter lot near the North
 *  White Plains train station, isn't included here — its street address
 *  spans a town-line quirk (colloquially "North White Plains" but
 *  addressed in the City of White Plains) that this app's North
 *  Castle-scoped geocoding can't resolve reliably. */
export const NC_PUBLIC_PARKING: PermitMarker[] = [
  {
    id: 'kent-place-lot',
    title: 'Kent Place Municipal Lot',
    address: 'Kent Place, Armonk, NY',
    sub: 'Downtown municipal lot behind the Main St. stores · serves the Library & Whippoorwill Theater · space count not published',
    color: PARKING_COLOR,
  },
  {
    id: 'whippoorwill-road-east-lot',
    title: 'Whippoorwill Road East Lot',
    address: '23 Whippoorwill Road East, Armonk, NY',
    sub: '49 spaces (43-space net gain) · built 2024-25 on former Verizon/municipal land, access via Kent Place',
    color: PARKING_COLOR,
  },
]

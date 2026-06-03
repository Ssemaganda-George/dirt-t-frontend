/** Curated Unsplash images tagged/located in Uganda for home destination tiles. */

export interface PopularDestination {
  name: string
  slug: string
  /** Unsplash CDN path segment, e.g. photo-1675756261486-09bd1e0f6c8a */
  imageId: string
  /** Short note for maintainers — not shown in UI */
  subject: string
}

const UNSPLASH_BASE = 'https://images.unsplash.com'

export function destinationImageUrl(imageId: string, size = 600): string {
  return `${UNSPLASH_BASE}/${imageId}?auto=format&fit=crop&w=${size}&h=${size}&q=80`
}

/** Generic Uganda safari fallback when a tile image fails to load */
export const DEFAULT_DESTINATION_IMAGE = destinationImageUrl(
  'photo-1663498798455-8ce6d44d4505'
)

export const POPULAR_DESTINATIONS: PopularDestination[] = [
  {
    name: 'Kampala',
    slug: 'hotels',
    imageId: 'photo-1675756261486-09bd1e0f6c8a',
    subject: 'Kampala city skyline, Uganda',
  },
  {
    name: 'Jinja',
    slug: 'activities',
    imageId: 'photo-1578805264874-050a89b27796',
    subject: 'Source of the Nile, Jinja',
  },
  {
    name: 'Entebbe',
    slug: 'hotels',
    imageId: 'photo-1621367296494-e64fd2a2d890',
    subject: 'Lake Victoria shoreline, Uganda',
  },
  {
    name: 'Murchison',
    slug: 'tours',
    imageId: 'photo-1704183683740-1400a49816b7',
    subject: 'Murchison Falls, Uganda',
  },
  {
    name: 'Bwindi',
    slug: 'tours',
    imageId: 'photo-1761204853161-f51581bc2f28',
    subject: 'Mountain gorilla, Bwindi Impenetrable Forest',
  },
  {
    name: 'Kidepo',
    slug: 'tours',
    imageId: 'photo-1701249883890-a18434fc70c0',
    subject: 'Kidepo Valley National Park savanna',
  },
]

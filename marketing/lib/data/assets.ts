export const ASSETS = [
  { slug: 'circularplatform', name: 'Circular' },
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
] as const;

export type AssetSlug = typeof ASSETS[number]['slug'];

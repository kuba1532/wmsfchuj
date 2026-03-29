export enum LocationType {
  BUFFER = 'BUFFER',
  STORAGE = 'STORAGE',
  PICKING_ZONE = 'PICKING_ZONE',
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  [LocationType.BUFFER]: 'Strefa przyjęć (buforowa)',
  [LocationType.STORAGE]: 'Składowanie',
  [LocationType.PICKING_ZONE]: 'Strefa kompletacji',
};

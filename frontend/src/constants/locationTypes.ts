export enum LocationType {
  BUFFER = 'STREFA_PRZYJEC',
  STORAGE = 'SKLADOWANIE',
  PICKING_ZONE = 'STREFA_KOMPLETACJI',
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  [LocationType.BUFFER]: 'Strefa przyjęć (buforowa)',
  [LocationType.STORAGE]: 'Składowanie',
  [LocationType.PICKING_ZONE]: 'Strefa kompletacji',
};

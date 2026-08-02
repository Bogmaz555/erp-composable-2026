/** PLM bounded context — versioned event payloads (Event Registry SSOT) */

export interface PlmBomReleasedComponentSnapshot {
  bomComponentId: string;
  childItemId: string;
  childPartNumber?: string;
  quantity: number;
  position?: number;
  scrapFactor?: number;
  effectivityFrom?: string | Date;
  effectivityTo?: string | Date;
  /** Double BOM — poziom w drzewie (0 = top) */
  bomLevel?: number;
  /** Alias used in design KD-E1.1 */
  level?: number;
  parentBomComponentId?: string;
  isSubAssembly?: boolean;
  subBomVersionId?: string;
  makeBuy?: 'MAKE' | 'BUY' | 'PHANTOM' | string;
}

/** Canonical payload for plm.bom.released.v2 (ETO traceability spine) */
export interface PlmBomReleasedV2Event {
  bomVersionId: string;
  itemId: string;
  revision: string;
  components: PlmBomReleasedComponentSnapshot[];
  projectId?: string;
  tenantId?: string;
  workOrderId?: string;
  machineSerial?: string;
  releasedAt?: string;
  releasedBy?: string;
  correlationId?: string;
}

/** Canonical payload for plm.eco.approved.v1 */
export interface PlmEcoApprovedV1Event {
  ecoId: string;
  ecoNumber: string;
  title?: string;
  affectedBomVersionIds: string[];
  releasedBomVersionIds?: string[];
  approvedBy?: string;
  approvedAt?: string;
  tenantId?: string;
  correlationId?: string;
}

export class BomReleasedEvent {
  constructor(
    public readonly bomVersionId: string,
    public readonly itemId: string,
    public readonly revision: string,
  ) {}
}

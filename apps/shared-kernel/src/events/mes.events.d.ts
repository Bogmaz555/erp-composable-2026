export declare class WorkOrderCompletedEvent {
    readonly workOrderId: string;
    readonly completedAt: Date;
    constructor(workOrderId: string, completedAt: Date);
}
export declare class ProductionRecordedEvent {
    readonly workOrderId: string;
    readonly quantityGood: number;
    readonly quantityScrap: number;
    readonly recordedAt: Date;
    constructor(workOrderId: string, quantityGood: number, quantityScrap: number, recordedAt: Date);
}
export interface MesProductionRecordedV1Event {
    workOrderId: string;
    projectId?: string;
    tenantId?: string;
    quantityGood: number;
    quantityScrap?: number;
    operatorId?: string;
    laborHours?: number;
    bomComponentIds?: string[];
    recordedAt?: string;
}
export declare class MaterialConsumedEvent {
    readonly workOrderId: string;
    readonly itemId: string;
    readonly quantity: number;
    readonly lotId?: string;
    constructor(workOrderId: string, itemId: string, quantity: number, lotId?: string);
}

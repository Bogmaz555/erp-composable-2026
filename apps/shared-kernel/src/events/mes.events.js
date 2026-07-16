"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialConsumedEvent = exports.ProductionRecordedEvent = exports.WorkOrderCompletedEvent = void 0;
class WorkOrderCompletedEvent {
    constructor(workOrderId, completedAt) {
        this.workOrderId = workOrderId;
        this.completedAt = completedAt;
    }
}
exports.WorkOrderCompletedEvent = WorkOrderCompletedEvent;
class ProductionRecordedEvent {
    constructor(workOrderId, quantityGood, quantityScrap, recordedAt) {
        this.workOrderId = workOrderId;
        this.quantityGood = quantityGood;
        this.quantityScrap = quantityScrap;
        this.recordedAt = recordedAt;
    }
}
exports.ProductionRecordedEvent = ProductionRecordedEvent;
class MaterialConsumedEvent {
    constructor(workOrderId, itemId, quantity, lotId) {
        this.workOrderId = workOrderId;
        this.itemId = itemId;
        this.quantity = quantity;
        this.lotId = lotId;
    }
}
exports.MaterialConsumedEvent = MaterialConsumedEvent;
//# sourceMappingURL=mes.events.js.map
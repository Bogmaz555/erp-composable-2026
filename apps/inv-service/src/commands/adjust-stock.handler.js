"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustStockHandler = exports.AdjustStockCommand = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const prisma_service_1 = require("../prisma.service");
class AdjustStockCommand {
    constructor(itemId, quantity) {
        this.itemId = itemId;
        this.quantity = quantity;
    }
}
exports.AdjustStockCommand = AdjustStockCommand;
let AdjustStockHandler = class AdjustStockHandler {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(command) {
        const existing = await this.prisma.stockLevel.findFirst({
            where: { itemId: command.itemId },
        });
        if (existing) {
            return this.prisma.stockLevel.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + command.quantity },
            });
        }
        else {
            return this.prisma.stockLevel.create({
                data: {
                    itemId: command.itemId,
                    quantity: command.quantity,
                },
            });
        }
    }
};
exports.AdjustStockHandler = AdjustStockHandler;
exports.AdjustStockHandler = AdjustStockHandler = __decorate([
    (0, cqrs_1.CommandHandler)(AdjustStockCommand),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdjustStockHandler);
//# sourceMappingURL=adjust-stock.handler.js.map
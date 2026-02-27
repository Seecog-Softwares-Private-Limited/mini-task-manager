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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const subscription_entity_1 = require("../entities/subscription.entity");
let SubscriptionsRepository = class SubscriptionsRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findByOrganization(organizationId) {
        return this.repo.findOne({
            where: { organizationId },
            relations: ['plan'],
            order: { createdAt: 'DESC' },
        });
    }
    async findByRazorpaySubscriptionId(razorpaySubId) {
        return this.repo.findOne({
            where: { razorpaySubscriptionId: razorpaySubId },
            relations: ['plan'],
        });
    }
    async findExpiredTrials() {
        return this.repo
            .createQueryBuilder('s')
            .where('s.status = :status', { status: 'TRIAL' })
            .andWhere('s.trial_ends_at <= NOW()')
            .getMany();
    }
    async create(data) {
        const id = data.id ?? (0, uuid_util_1.generateUuid)();
        const entity = this.repo.create({ ...data, id });
        return this.repo.save(entity);
    }
    async save(entity) {
        return this.repo.save(entity);
    }
};
exports.SubscriptionsRepository = SubscriptionsRepository;
exports.SubscriptionsRepository = SubscriptionsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.SubscriptionEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SubscriptionsRepository);
//# sourceMappingURL=subscriptions.repository.js.map
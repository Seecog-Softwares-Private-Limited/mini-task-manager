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
exports.ActivityLogsService = void 0;
const common_1 = require("@nestjs/common");
const activity_logs_repository_1 = require("./repositories/activity-logs.repository");
const pagination_1 = require("../../common/pagination");
let ActivityLogsService = class ActivityLogsService {
    constructor(activityLogsRepository) {
        this.activityLogsRepository = activityLogsRepository;
    }
    async findByOrganization(organizationId, query) {
        const page = query?.page ?? 1;
        const limit = query?.limit ?? 20;
        const [data, total] = await this.activityLogsRepository.findByOrganization(organizationId, page, limit);
        return (0, pagination_1.paginate)(data, total, page, limit);
    }
    async log(data) {
        await this.activityLogsRepository.create(data);
    }
};
exports.ActivityLogsService = ActivityLogsService;
exports.ActivityLogsService = ActivityLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [activity_logs_repository_1.ActivityLogsRepository])
], ActivityLogsService);
//# sourceMappingURL=activity-logs.service.js.map
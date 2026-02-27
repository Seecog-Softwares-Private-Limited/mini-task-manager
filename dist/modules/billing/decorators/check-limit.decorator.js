"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckSubscriptionLimit = exports.CHECK_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CHECK_LIMIT_KEY = 'check_subscription_limit';
const CheckSubscriptionLimit = (resource) => (0, common_1.SetMetadata)(exports.CHECK_LIMIT_KEY, resource);
exports.CheckSubscriptionLimit = CheckSubscriptionLimit;
//# sourceMappingURL=check-limit.decorator.js.map
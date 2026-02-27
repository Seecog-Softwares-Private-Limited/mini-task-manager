"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageService = exports.SubscriptionGuard = exports.CheckSubscriptionLimit = void 0;
exports.isSubscriptionLimitError = isSubscriptionLimitError;
var check_limit_decorator_1 = require("./decorators/check-limit.decorator");
Object.defineProperty(exports, "CheckSubscriptionLimit", { enumerable: true, get: function () { return check_limit_decorator_1.CheckSubscriptionLimit; } });
var subscription_guard_1 = require("./guards/subscription.guard");
Object.defineProperty(exports, "SubscriptionGuard", { enumerable: true, get: function () { return subscription_guard_1.SubscriptionGuard; } });
var usage_service_1 = require("./usage.service");
Object.defineProperty(exports, "UsageService", { enumerable: true, get: function () { return usage_service_1.UsageService; } });
function isSubscriptionLimitError(err) {
    const data = err?.response?.data;
    return data != null && typeof data === 'object' && data.code === 'SUBSCRIPTION_LIMIT_EXCEEDED';
}
//# sourceMappingURL=feature-guard.js.map
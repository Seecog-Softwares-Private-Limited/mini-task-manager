"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottleModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
let ThrottleModule = class ThrottleModule {
};
exports.ThrottleModule = ThrottleModule;
exports.ThrottleModule = ThrottleModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const auth = config.get('throttle.auth', { infer: true });
                    const general = config.get('throttle.general', { infer: true });
                    return {
                        throttlers: [
                            { name: 'auth', limit: auth.limit, ttl: auth.ttl },
                            { name: 'default', limit: general.limit, ttl: general.ttl },
                        ],
                        getTracker: (req) => req.user?.userId ?? req.ip ?? 'unknown',
                    };
                },
            }),
        ],
    })
], ThrottleModule);
//# sourceMappingURL=throttle.module.js.map
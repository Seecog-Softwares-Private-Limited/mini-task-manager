"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUserId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUserId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) {
        throw new common_1.UnauthorizedException('Unauthorized');
    }
    return userId;
});
//# sourceMappingURL=current-user.decorator.js.map
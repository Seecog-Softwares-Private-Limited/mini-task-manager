"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFrontendUrl = void 0;
exports.resolveFrontendPublicUrl = resolveFrontendPublicUrl;
function resolveFrontendPublicUrl() {
    const explicit = process.env.FRONTEND_URL?.trim();
    if (explicit) {
        return explicit.replace(/\/$/, '');
    }
    const port = process.env.FRONTEND_PORT || '3001';
    return `http://localhost:${port}`;
}
exports.getFrontendUrl = resolveFrontendPublicUrl;
//# sourceMappingURL=frontend-url.util.js.map
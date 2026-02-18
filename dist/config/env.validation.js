"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(config) {
    const loaded = config;
    if (loaded?.nodeEnv === 'production') {
        const secret = loaded.jwt?.secret;
        if (!secret || secret === 'change-me-in-production') {
            throw new Error('JWT_SECRET must be set to a non-default value in production. Refusing to start.');
        }
        if (loaded.database?.synchronize === true) {
            throw new Error('DB_SYNCHRONIZE must not be true in production. Use migrations instead. Refusing to start.');
        }
    }
    return config;
}
//# sourceMappingURL=env.validation.js.map
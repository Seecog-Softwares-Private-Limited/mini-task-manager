"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPasswordAgainstStored = verifyPasswordAgainstStored;
const bcrypt = require("bcrypt");
async function verifyPasswordAgainstStored(plainPassword, stored) {
    if (stored == null || stored === '')
        return false;
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
        return bcrypt.compare(plainPassword, stored);
    }
    return plainPassword === stored;
}
//# sourceMappingURL=password-storage.util.js.map
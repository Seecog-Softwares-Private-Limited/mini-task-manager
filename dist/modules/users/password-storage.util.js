"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toStoredPassword = toStoredPassword;
exports.verifyPasswordAgainstStored = verifyPasswordAgainstStored;
function toStoredPassword(plainPassword) {
    return plainPassword;
}
async function verifyPasswordAgainstStored(plainPassword, stored) {
    if (stored == null || stored === '')
        return false;
    return plainPassword === stored;
}
//# sourceMappingURL=password-storage.util.js.map
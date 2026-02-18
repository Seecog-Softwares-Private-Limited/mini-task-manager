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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const users_repository_1 = require("./repositories/users.repository");
const bcrypt = require("bcrypt");
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async findById(id) {
        return this.usersRepository.findById(id);
    }
    async findByEmail(email) {
        return this.usersRepository.findByEmail(email);
    }
    async findByIdForAuth(id) {
        const user = await this.usersRepository.findById(id);
        if (!user)
            return null;
        return { id: user.id, email: user.email };
    }
    async validatePassword(userId, plainPassword) {
        const user = await this.usersRepository.findById(userId);
        if (!user?.passwordHash)
            return false;
        return bcrypt.compare(plainPassword, user.passwordHash);
    }
    async create(data) {
        const hash = await bcrypt.hash(data.password, 10);
        return this.usersRepository.create({
            email: data.email.toLowerCase(),
            fullName: data.fullName,
            passwordHash: hash,
        });
    }
    async deleteById(id) {
        await this.usersRepository.deleteById(id);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map
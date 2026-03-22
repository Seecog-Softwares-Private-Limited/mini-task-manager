import { type ValueTransformer } from 'typeorm';
export declare const uuidBinaryTransformer: ValueTransformer;
export declare abstract class BaseEntity {
    createdAt: Date;
    updatedAt: Date;
}

export declare const configuration: () => {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    frontendUrl: string;
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
        verifyOnStartup: boolean;
    };
    uploadsPath: string;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    throttle: {
        auth: {
            ttl: number;
            limit: number;
        };
        general: {
            ttl: number;
            limit: number;
        };
    };
    database: {
        type: "mysql";
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        synchronize: boolean;
        logging: boolean;
        extra: {
            connectionLimit: number;
            queueLimit: number | undefined;
            connectTimeout: number;
        };
    };
};
export type Configuration = ReturnType<typeof configuration>;

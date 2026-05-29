import { validate } from '../src/config/env.validation';

describe('env.validation', () => {
  const baseProd = {
    nodeEnv: 'production',
    jwt: { secret: 'real-production-secret' },
    database: { synchronize: false },
  };

  it('allows production when FRONTEND_URL is a public URL', () => {
    expect(
      validate({
        ...baseProd,
        frontendUrl: 'http://3.110.214.243:3000',
      }),
    ).toEqual({
      ...baseProd,
      frontendUrl: 'http://3.110.214.243:3000',
    });
  });

  it('refuses production when FRONTEND_URL is localhost', () => {
    expect(() =>
      validate({
        ...baseProd,
        frontendUrl: 'http://localhost:3008',
      }),
    ).toThrow(/FRONTEND_URL must be set to your public app URL/);
  });

  it('refuses production when FRONTEND_URL is missing', () => {
    expect(() => validate({ ...baseProd })).toThrow(/FRONTEND_URL must be set/);
  });

  it('allows development with localhost FRONTEND_URL', () => {
    expect(
      validate({
        nodeEnv: 'development',
        frontendUrl: 'http://localhost:3008',
      }),
    ).toEqual({
      nodeEnv: 'development',
      frontendUrl: 'http://localhost:3008',
    });
  });
});

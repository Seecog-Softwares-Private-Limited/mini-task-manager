import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3001",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    video: false,
    screenshotOnRunFailure: true,
    env: {
      apiUrl: process.env.CYPRESS_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
      CYPRESS_TEST_USER_EMAIL: process.env.CYPRESS_TEST_USER_EMAIL,
      CYPRESS_TEST_USER_PASSWORD: process.env.CYPRESS_TEST_USER_PASSWORD,
      CYPRESS_TEST_MEMBER_EMAIL: process.env.CYPRESS_TEST_MEMBER_EMAIL,
      CYPRESS_TEST_MEMBER_PASSWORD: process.env.CYPRESS_TEST_MEMBER_PASSWORD,
      CYPRESS_TEST_ORG_ID: process.env.CYPRESS_TEST_ORG_ID,
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});

/// <reference types="cypress" />

/**
 * Test 1: Login flow – visit login, sign in, assert redirect and token.
 * Test 7: Logout + session expiry – logout redirect, clear token, protected route redirect.
 */

const getTestUser = () => ({
  email: Cypress.env("CYPRESS_TEST_USER_EMAIL") ?? "owner@example.com",
  password: Cypress.env("CYPRESS_TEST_USER_PASSWORD") ?? "Password123!",
});

describe("Login flow", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("shows login page and form", () => {
    cy.get("[data-cy=login-page]").should("be.visible");
    cy.get("[data-cy=login-email]").should("be.visible");
    cy.get("[data-cy=login-password]").should("be.visible");
    cy.get("[data-cy=login-submit]").should("be.visible").and("contain", "Sign in");
  });

  it("logs in with valid credentials and redirects to dashboard", () => {
    const { email, password } = getTestUser();
    cy.get("[data-cy=login-email]").type(email);
    cy.get("[data-cy=login-password]").type(password);
    cy.get("[data-cy=login-submit]").click();

    cy.url({ timeout: 15000 }).should("include", "/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
  });

  it("stores token after login and dashboard loads", () => {
    const { email, password } = getTestUser();
    cy.get("[data-cy=login-email]").type(email);
    cy.get("[data-cy=login-password]").type(password);
    cy.get("[data-cy=login-submit]").click();

    cy.url({ timeout: 15000 }).should("include", "/dashboard");
    cy.window().then((win) => {
      const token = win.localStorage.getItem("mini_tm_token");
      expect(token).to.be.a("string");
      expect(token!.length).to.be.greaterThan(50);
    });
  });

  it("redirects to login when visiting protected route unauthenticated", () => {
    cy.window().then((win) => {
      win.localStorage.removeItem("mini_tm_token");
      win.localStorage.removeItem("mini_tm_org_id");
      win.document.cookie = "mini_tm_signed_in=; path=/; max-age=0";
    });
    cy.visit("/dashboard");
    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.get("[data-cy=login-page]").should("be.visible");
  });
});

describe("Logout and session expiry", () => {
  it("logout redirects to login", () => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=logout-button]").click();
    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.get("[data-cy=login-page]").should("be.visible");
  });

  it("after clearing token, visiting protected route redirects to login", () => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
    cy.logout();
    cy.visit("/dashboard");
    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.get("[data-cy=login-page]").should("be.visible");
  });
});

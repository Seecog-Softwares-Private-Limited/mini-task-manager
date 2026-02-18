/// <reference types="cypress" />

/**
 * Test 5: Billing access control – login as MEMBER, billing not visible; login as ADMIN, billing visible.
 * Requires: CYPRESS_TEST_MEMBER_EMAIL/PASSWORD (member), CYPRESS_TEST_USER_EMAIL/PASSWORD (admin/owner).
 */

const getAdminUser = () => ({
  email: Cypress.env("CYPRESS_TEST_USER_EMAIL") ?? Cypress.env("CYPRESS_TEST_ADMIN_EMAIL") ?? "admin@example.com",
  password: Cypress.env("CYPRESS_TEST_USER_PASSWORD") ?? Cypress.env("CYPRESS_TEST_ADMIN_PASSWORD") ?? "Password123!",
});

const getMemberUser = () => ({
  email: Cypress.env("CYPRESS_TEST_MEMBER_EMAIL") ?? "member@example.com",
  password: Cypress.env("CYPRESS_TEST_MEMBER_PASSWORD") ?? "Password123!",
});

describe("Billing access control", () => {
  it("when logged in as member, billing nav link is not visible", () => {
    cy.login({
      email: getMemberUser().email,
      password: getMemberUser().password,
    });
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
    cy.get("body").then(($body) => {
      if ($body.find("[data-cy=nav-billing]").length === 0) {
        cy.log("Billing link correctly hidden for member");
      } else {
        throw new Error("Member should not see billing link");
      }
    });
  });

  it("when logged in as admin/owner, billing nav link is visible", () => {
    cy.login({
      email: getAdminUser().email,
      password: getAdminUser().password,
    });
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=nav-billing]", { timeout: 5000 }).should("be.visible");
  });

  it("admin can open billing page", () => {
    cy.login({
      email: getAdminUser().email,
      password: getAdminUser().password,
    });
    cy.visit("/dashboard/billing");
    cy.url({ timeout: 10000 }).should("include", "/dashboard/billing");
    cy.contains("Billing", { matchCase: false }).should("be.visible");
  });
});

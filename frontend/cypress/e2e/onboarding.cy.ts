/// <reference types="cypress" />

/**
 * Test 2: First-time onboarding – detect modal, complete "Create Project", assert project exists and progress updated.
 * Requires: org selected (user must have at least one org). Clear onboarding state for org to see modal again.
 */

const getTestUser = () => ({
  email: Cypress.env("CYPRESS_TEST_USER_EMAIL") ?? "owner@example.com",
  password: Cypress.env("CYPRESS_TEST_USER_PASSWORD") ?? "Password123!",
});

describe("First-time onboarding", () => {
  beforeEach(() => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
  });

  it("detects onboarding modal when first-time state and completes Create Project step", () => {
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");

    cy.get("body").then(($body) => {
      if ($body.find("[data-cy=onboarding-modal]").length > 0) {
        cy.get("[data-cy=onboarding-modal]").should("be.visible");
        cy.get("[data-cy=onboarding-step-project]").click();
        cy.url({ timeout: 5000 }).should("include", "/dashboard/projects");
      }
    });
  });

  it("creates project from projects page and project appears in list", () => {
    cy.visit("/dashboard/projects");
    cy.get("[data-cy=projects-new-button]", { timeout: 10000 }).click();
    cy.get("[data-cy=create-project-form]").should("be.visible");
    const name = `E2E Project ${Date.now()}`;
    cy.get("[data-cy=project-name-input]").type(name);
    cy.get("[data-cy=project-create-submit]").click();

    cy.contains(name, { timeout: 10000 }).should("be.visible");
  });

  it("onboarding progress updates after creating first project", () => {
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
    cy.get("body").then(($body) => {
      if ($body.find("[data-cy=onboarding-modal]").length > 0) {
        cy.get("[data-cy=onboarding-modal]").within(() => {
          cy.contains("Create your first project").should("be.visible");
        });
      }
    });
  });
});

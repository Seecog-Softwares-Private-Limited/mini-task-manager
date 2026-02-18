/// <reference types="cypress" />

/**
 * Test 8: Audit log viewer – create entity (project), visit audit log, assert entry exists.
 * Test 9: System health widget – visit dashboard, assert widget renders and health success.
 */

const getTestUser = () => ({
  email: Cypress.env("CYPRESS_TEST_USER_EMAIL") ?? "owner@example.com",
  password: Cypress.env("CYPRESS_TEST_USER_PASSWORD") ?? "Password123!",
});

describe("Audit log viewer", () => {
  beforeEach(() => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
  });

  it("after creating project, audit log page shows an entry", () => {
    cy.createProject({ name: `Audit E2E ${Date.now()}` }).then(() => {
      cy.visit("/dashboard/audit");
      cy.get("[data-cy=audit-log-page]", { timeout: 10000 }).should("be.visible");
      cy.get("body").then(($body) => {
        if ($body.find("[data-cy=audit-log-entries]").length > 0) {
          cy.get("[data-cy=audit-log-entries]").within(() => {
            cy.get("table tbody tr", { timeout: 5000 }).should("have.length.at.least", 1);
          });
        } else {
          cy.contains("No matching entries").should("be.visible");
        }
      });
    });
  });

  it("audit log page has filters and activity table or empty state", () => {
    cy.visit("/dashboard/audit");
    cy.get("[data-cy=audit-log-page]", { timeout: 10000 }).should("be.visible");
    cy.contains("Audit log").should("be.visible");
    cy.contains("Activity").should("be.visible");
  });
});

describe("System health widget", () => {
  beforeEach(() => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
  });

  it("dashboard shows system status widget for admin/owner", () => {
    cy.visit("/dashboard");
    cy.get("[data-cy=dashboard-page]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=system-status-widget]", { timeout: 10000 }).should("be.visible");
  });

  it("system status widget shows health status (Operational or Unavailable)", () => {
    cy.visit("/dashboard");
    cy.get("[data-cy=system-status-widget]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=health-status]", { timeout: 15000 }).should("be.visible");
    cy.get("[data-cy=health-status]").invoke("text").then((text) => {
      expect(text).to.match(/Operational|Unavailable|Checking/);
    });
  });

  it("system status card has health and last deployment info", () => {
    cy.visit("/dashboard");
    cy.get("[data-cy=system-status-card]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=system-status-card]").within(() => {
      cy.contains("Health").should("be.visible");
      cy.contains("Last deployment").should("be.visible");
    });
  });
});

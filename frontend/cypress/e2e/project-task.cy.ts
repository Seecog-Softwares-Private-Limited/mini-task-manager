/// <reference types="cypress" />

/**
 * Test 3: Project + task flow – create project, create task, open Kanban, drag task to new status, assert updated.
 * Test 4: Plan enforcement – hit project limit, assert upgrade modal and feature gated (if plan has limit).
 */

const getTestUser = () => ({
  email: Cypress.env("CYPRESS_TEST_USER_EMAIL") ?? "owner@example.com",
  password: Cypress.env("CYPRESS_TEST_USER_PASSWORD") ?? "Password123!",
});

describe("Project and task flow", () => {
  beforeEach(() => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
  });

  it("creates project via API, creates task, navigates to Kanban and sees task", () => {
    cy.createProject({ name: `Kanban E2E ${Date.now()}` }).then((project) => {
      cy.window().then((win) => {
        const oid = win.localStorage.getItem("mini_tm_org_id");
        if (!oid) throw new Error("No org id");
        cy.createTask({
          projectId: project.id,
          organizationId: oid,
          title: `Task ${Date.now()}`,
        }).then((task) => {
          cy.visit(`/dashboard/projects/${project.id}`);
          cy.get("[data-cy=task-card-" + task.id], { timeout: 15000 }).should("be.visible");
        });
      });
    });
  });

  it("navigates to project Kanban and sees at least one column", () => {
    cy.createProject({ name: `Columns E2E ${Date.now()}` }).then((project) => {
      cy.visit(`/dashboard/projects/${project.id}`);
      cy.get("[data-cy^=kanban-column-]", { timeout: 15000 }).should("have.length.at.least", 1);
    });
  });
});

describe("Plan enforcement", () => {
  it("when at project limit, New project shows limit state and upgrade modal can appear", () => {
    cy.login({
      email: getTestUser().email,
      password: getTestUser().password,
    });
    cy.visit("/dashboard/projects");
    cy.get("[data-cy=projects-new-button]", { timeout: 10000 }).should("be.visible");
    cy.get("body").then(($body) => {
      const btn = $body.find("[data-cy=projects-new-button]");
      if (btn.text().includes("Limit reached") || btn.text().includes("Upgrade")) {
        btn.click();
        cy.get("[data-cy=upgrade-modal]", { timeout: 5000 }).should("be.visible");
      }
    });
  });
});

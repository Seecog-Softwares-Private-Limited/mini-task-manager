/// <reference types="cypress" />

const TOKEN_KEY = "mini_tm_token";
const ORG_KEY = "mini_tm_org_id";
const AUTH_COOKIE = "mini_tm_signed_in=1; path=/; max-age=604800; SameSite=Lax";

export interface LoginOptions {
  email: string;
  password: string;
  orgId?: string;
}

Cypress.Commands.add("login", (options: LoginOptions) => {
  const { email, password, orgId } = options;
  const resolvedOrgId = orgId ?? (Cypress.env("CYPRESS_TEST_ORG_ID") as string | undefined);
  const apiUrl = Cypress.env("apiUrl") as string;
  cy.request({
    method: "POST",
    url: `${apiUrl}/auth/login`,
    body: { email, password },
    failOnStatusCode: true,
  }).then((res) => {
    const token = res.body.accessToken as string;
    cy.window().then((win) => {
      win.localStorage.setItem(TOKEN_KEY, token);
      if (resolvedOrgId) win.localStorage.setItem(ORG_KEY, resolvedOrgId);
      win.document.cookie = AUTH_COOKIE;
    });
  });
});

Cypress.Commands.add("logout", () => {
  cy.window().then((win) => {
    win.localStorage.removeItem(TOKEN_KEY);
    win.localStorage.removeItem(ORG_KEY);
    win.document.cookie = `${AUTH_COOKIE.split("=")[0]}=; path=/; max-age=0`;
  });
});

export interface CreateProjectOptions {
  name: string;
  description?: string;
  visibility?: string;
}

Cypress.Commands.add("createProject", (options: CreateProjectOptions) => {
  const apiUrl = Cypress.env("apiUrl") as string;
  return cy.window().then((win) => {
    const token = win.localStorage.getItem(TOKEN_KEY);
    const orgId = win.localStorage.getItem(ORG_KEY);
    if (!token || !orgId) throw new Error("Must be logged in with org selected");
    return cy
      .request({
        method: "POST",
        url: `${apiUrl}/projects`,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-Id": orgId,
          "Content-Type": "application/json",
        },
        body: {
          name: options.name,
          description: options.description ?? "",
          visibility: options.visibility ?? "PRIVATE",
        },
        failOnStatusCode: true,
      })
      .its("body")
      .then((body) => body as { id: string; name: string });
  });
});

export interface CreateTaskOptions {
  projectId: string;
  organizationId: string;
  title: string;
  description?: string;
  statusId?: string;
}

Cypress.Commands.add("createTask", (options: CreateTaskOptions) => {
  const apiUrl = Cypress.env("apiUrl") as string;
  return cy.window().then((win) => {
    const token = win.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Must be logged in");
    return cy
      .request({
        method: "POST",
        url: `${apiUrl}/tasks`,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-Id": options.organizationId,
          "Content-Type": "application/json",
        },
        body: {
          projectId: options.projectId,
          organizationId: options.organizationId,
          title: options.title,
          description: options.description,
          statusId: options.statusId,
        },
        failOnStatusCode: true,
      })
      .its("body")
      .then((body) => body as { id: string; title: string; statusId?: string });
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(options: LoginOptions): Chainable<void>;
      logout(): Chainable<void>;
      createProject(options: CreateProjectOptions): Chainable<{ id: string; name: string }>;
      createTask(options: CreateTaskOptions): Chainable<{ id: string; title: string; statusId?: string }>;
    }
  }
}

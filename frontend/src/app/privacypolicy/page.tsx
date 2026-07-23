import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { OpsPickLogo } from "@/components/brand/opspick-logo";

export const metadata: Metadata = {
  title: "Privacy Policy | OpsPick",
  description:
    "Privacy Policy for OpsPick by Seecog Softwares Pvt. Ltd. — how we collect and use name and email.",
};

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "introduction",
    title: "1. Introduction",
    body: (
      <p>
        Seecog Softwares Pvt. Ltd. (“Seecog”, “we”, “our”, or “us”) is committed to protecting your
        privacy. This Privacy Policy explains how OpsPick collects, uses, stores, and protects your
        information when you use the OpsPick mobile application, website, and related services.
      </p>
    ),
  },
  {
    id: "scope",
    title: "2. Scope",
    body: (
      <p>
        This Privacy Policy applies to the OpsPick mobile application, associated backend services
        operated by Seecog Softwares Pvt. Ltd., and user accounts created within OpsPick.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "3. Information We Collect",
    body: (
      <>
        <p>
          OpsPick collects only the following personal information needed to create and operate your
          account:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Name</strong> — to identify your account within your workspace
          </li>
          <li>
            <strong>Email address</strong> — to authenticate you, send account-related messages, and
            provide support
          </li>
        </ul>
        <p className="mt-3">
          We do not collect personal information for advertising, cross-app tracking, or sale to third
          parties. Name and email are used only to provide OpsPick account and service functionality —
          not for unrelated identification, profiling, or marketing beyond operating the product.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "4. How We Use Your Information",
    body: (
      <p>
        Name and email are used solely to authenticate users, manage accounts and workspaces, provide
        customer support, and maintain platform security. We do not use this data for advertising,
        analytics profiling, or any purpose unrelated to providing OpsPick.
      </p>
    ),
  },
  {
    id: "subscription",
    title: "5. Subscription Plans",
    body: (
      <p>
        OpsPick may offer free and paid subscription tiers. Subscription status and payment management
        are handled through Seecog Softwares Pvt. Ltd.’s web platform and backend services where
        applicable. Details of in-app purchases, if any, are governed by the applicable store terms.
      </p>
    ),
  },
  {
    id: "storage",
    title: "6. Data Storage",
    body: (
      <p>
        Account data may be stored using infrastructure such as Amazon Web Services (AWS) or
        equivalent hosting providers. Appropriate safeguards are implemented to help protect your
        information.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "7. Information Sharing",
    body: (
      <p>
        We do not sell or rent personal information. Name and email may be disclosed only as needed to
        operate our services (for example, hosting providers), to comply with legal obligations, to
        protect legal rights, or to investigate security incidents.
      </p>
    ),
  },
  {
    id: "security",
    title: "8. Data Security",
    body: (
      <p>
        We implement reasonable administrative, technical, and organizational safeguards to protect
        personal information. No method of transmission or storage can be guaranteed to be completely
        secure.
      </p>
    ),
  },
  {
    id: "retention",
    title: "9. Data Retention",
    body: (
      <p>
        Name and email are retained only as long as necessary to provide OpsPick services, comply with
        legal obligations, resolve disputes, and enforce agreements.
      </p>
    ),
  },
  {
    id: "rights",
    title: "10. User Rights",
    body: (
      <p>
        Where permitted by applicable law, you may request access to, correction of, or deletion of
        your personal information by contacting us at the email below.
      </p>
    ),
  },
  {
    id: "deletion",
    title: "11. Account Deletion",
    body: (
      <p>
        To request deletion of your OpsPick account and associated server data (including name and
        email), contact{" "}
        <a className="text-primary underline-offset-2 hover:underline" href="mailto:info@seecogsoftwares.com">
          info@seecogsoftwares.com
        </a>
        . Workspace owners may also manage workspaces through the web application where applicable.
      </p>
    ),
  },
  {
    id: "children",
    title: "12. Children’s Privacy",
    body: (
      <p>
        OpsPick is intended for business and organizational use and is not directed toward children
        under 13 years of age. We do not knowingly collect personal information from children.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "13. Third-Party Services",
    body: (
      <p>
        OpsPick communicates with backend services operated by Seecog Softwares Pvt. Ltd. Account data
        may be stored using cloud hosting providers such as AWS. OpsPick does not integrate third-party
        advertising SDKs for the purpose of selling or tracking personal data described in this policy.
      </p>
    ),
  },
  {
    id: "changes",
    title: "14. Changes to This Privacy Policy",
    body: (
      <p>
        We may update this Privacy Policy periodically. Updated versions will be published on this page
        with a revised Effective Date.
      </p>
    ),
  },
  {
    id: "contact",
    title: "15. Contact Us",
    body: (
      <p>
        Seecog Softwares Pvt. Ltd.
        <br />
        OpsPick:{" "}
        <a
          className="text-primary underline-offset-2 hover:underline"
          href="https://opspick.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://opspick.com
        </a>
        <br />
        Company website:{" "}
        <a
          className="text-primary underline-offset-2 hover:underline"
          href="https://www.seecogsoftwares.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://www.seecogsoftwares.com
        </a>
        <br />
        Email:{" "}
        <a className="text-primary underline-offset-2 hover:underline" href="mailto:info@seecogsoftwares.com">
          info@seecogsoftwares.com
        </a>
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="OpsPick home">
            <OpsPickLogo className="h-9 w-9" />
            <span className="text-[1.0625rem] font-semibold tracking-tight">OpsPick</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-sm font-medium text-muted-foreground">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-muted-foreground">
          OpsPick — developed and operated by Seecog Softwares Pvt. Ltd.
        </p>

        <dl className="mt-8 grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Effective Date</dt>
            <dd className="mt-0.5 font-medium">July 13, 2026</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="mt-0.5 font-medium">1.0</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Application</dt>
            <dd className="mt-0.5 font-medium">OpsPick</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="mt-0.5 font-medium">Seecog Softwares Pvt. Ltd.</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="mt-0.5 font-medium">
              <a className="text-primary underline-offset-2 hover:underline" href="mailto:info@seecogsoftwares.com">
                info@seecogsoftwares.com
              </a>
              {" · "}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="https://opspick.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                opspick.com
              </a>
              {" · "}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="https://www.seecogsoftwares.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.seecogsoftwares.com
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-foreground/90">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-muted-foreground [&_strong]:text-foreground">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} OpsPick · Seecog Softwares Pvt. Ltd.</p>
          <Link href="/privacypolicy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

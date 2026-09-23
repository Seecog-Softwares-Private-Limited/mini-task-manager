import type { Metadata } from "next";
import Link from "next/link";
import { OpsPickLogo } from "@/components/brand/opspick-logo";

export const metadata: Metadata = {
  title: "Support | OpsPick",
  description:
    "Get help with OpsPick — contact Seecog Softwares Pvt. Ltd. for account and product support.",
};

export default function SupportPage() {
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
        <p className="text-sm font-medium text-muted-foreground">Help</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Support</h1>
        <p className="mt-3 text-muted-foreground">
          OpsPick is developed and operated by Seecog Softwares Pvt. Ltd. Use the contacts below for
          account help, technical issues, or product questions.
        </p>

        <section className="mt-10 rounded-2xl border border-border/70 bg-muted/20 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Contact us</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Email us and we will get back to you as soon as we can.
          </p>
          <p className="mt-5 text-[15px] leading-relaxed">
            <span className="text-muted-foreground">Email: </span>
            <a
              className="font-medium text-primary underline-offset-2 hover:underline"
              href="mailto:info@seecogsoftwares.com"
            >
              info@seecogsoftwares.com
            </a>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed">
            <span className="text-muted-foreground">Company: </span>
            <a
              className="font-medium text-primary underline-offset-2 hover:underline"
              href="https://www.seecogsoftwares.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.seecogsoftwares.com
            </a>
          </p>
        </section>

        <section className="mt-10 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">What we can help with</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Signing in, account access, and password resets</li>
            <li>Workspaces, invitations, and permissions</li>
            <li>Using boards, tasks, and collaboration features</li>
            <li>Privacy or data requests (see our Privacy Policy)</li>
          </ul>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          Looking for our privacy practices?{" "}
          <Link href="/privacypolicy" className="text-primary underline-offset-2 hover:underline">
            Read the Privacy Policy
          </Link>
          .
        </p>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} OpsPick · Seecog Softwares Pvt. Ltd.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/support" className="hover:text-foreground">
              Support
            </Link>
            <Link href="/privacypolicy" className="hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

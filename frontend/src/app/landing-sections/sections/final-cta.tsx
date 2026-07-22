import Link from "next/link";
import { IconArrowRight } from "../icons";

export function FinalCtaSection() {
  return (
    <section className="lp-cta-section py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
        <div className="lp-reveal">
          <h2 className="lp-heading">Ready to ship faster?</h2>
          <p className="lp-body-lg mt-3 mx-auto max-w-lg">
            Join teams using OpsPick to organize work, track progress, and deliver results — without the complexity.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="lp-btn-primary px-7 py-3 text-base w-full sm:w-auto">
              Get started for free
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="lp-btn-secondary px-7 py-3 text-base w-full sm:w-auto">
              Sign in to your workspace
            </Link>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            No credit card required · Free forever plan · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

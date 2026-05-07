import Link from "next/link";
import { site } from "@/lib/data/site";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-white border-t border-[var(--color-line)]">
      <div className="container-page py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Link href="/" className="inline-block mb-4" aria-label={`${site.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt={site.name} className="h-12 w-auto" />
          </Link>
          <p className="text-sm text-muted max-w-md leading-relaxed">
            {site.name} is a registered charitable trust (Reg. No. {site.registration}). Every rupee you donate reaches the cause — we run on 0% administrative expenses.
          </p>
          <p className="mt-4 text-sm text-muted">
            <a href={`mailto:${site.email}`} className="hover:text-accent-600 underline-offset-4 hover:underline">{site.email}</a>
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3 font-sans uppercase tracking-wider">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/who-we-are" className="hover:text-accent-600">Who We Are</Link></li>
            <li><Link href="/how-we-work" className="hover:text-accent-600">How We Work</Link></li>
            <li><Link href="/current-causes" className="hover:text-accent-600">Current Causes</Link></li>
            <li><Link href="/success-stories" className="hover:text-accent-600">Success Stories</Link></li>
            <li><Link href="/refer-a-cause" className="hover:text-accent-600">Refer a Cause</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3 font-sans uppercase tracking-wider">Trust</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/legal-financial" className="hover:text-accent-600">Financials</Link></li>
            <li><Link href="/terms-conditions" className="hover:text-accent-600">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-accent-600">Privacy Policy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-accent-600">Refund Policy</Link></li>
            <li><Link href="/contact-us" className="hover:text-accent-600">Contact Us</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)]">
        <div className="container-page py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted">
          <p>© {year} {site.name} Trust. Established {site.established}. All rights reserved.</p>
          <p>Donations are eligible for tax exemption under Section 80G.</p>
        </div>
      </div>
    </footer>
  );
}

import PageHero from "@/components/PageHero";
import { site } from "@/lib/data/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <div className="container-page py-12 md:py-16">
        <div className="prose-mc">
          <h2>Our commitment to privacy</h2>
          <p>MicroCharity knows that you care how information about you is used and shared, and we appreciate your trust. This Privacy Policy explains our online information practices and the choices you can make about how your information is collected and used. By visiting www.microcharity.com you accept the practices described here.</p>
          <p>Our website is maintained by MicroCharity, with headquarters at {site.address}.</p>

          <h2>What personally identifiable information is collected?</h2>
          <p>When you visit our website, you may provide us with personal information (name, address, email, and phone) that you knowingly choose to disclose. We collect this for purposes such as registering for newsletters, requesting further information, donating, ordering merchandise, submitting a form, or asking a question. We do not collect personal information from you unless you provide it. You are free to browse the site without revealing any personally identifiable information.</p>

          <h2>Payment information</h2>
          <p>All online card, UPI, and net-banking payments on this site are processed by <a href="https://razorpay.com/" target="_blank" rel="noopener noreferrer">Razorpay</a>, our PCI&nbsp;DSS-compliant payment gateway. Card numbers, CVV, OTPs, UPI PINs, and bank credentials are entered directly on Razorpay&apos;s secure interface and <strong>are never seen, stored, or processed by MicroCharity</strong>. MicroCharity only receives the donation amount, a Razorpay transaction reference, and the contact details you supply for the donation receipt. Refer to <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay&apos;s privacy policy</a> for how they handle payment data.</p>

          <h2>How we use your information</h2>
          <p>When you supply information for a specific purpose, we use it only for that purpose. We use return email addresses to answer the email we receive; such addresses are not used for any other purpose and are not shared with outside parties. <strong>MicroCharity does not sell, rent, give away or share its email addresses or other information with outside sources.</strong></p>

          <h2>Data security</h2>
          <p>Personally identifiable information is stored on our server and is not publicly accessible. It is only accessed by MicroCharity personnel on a &quot;need to know&quot; basis. Sensitive fields we do hold (such as PAN, when you choose to provide it for an 80G receipt) are encrypted at rest, and all traffic between your browser and our site is protected with HTTPS / TLS. Card and bank credentials are handled exclusively by Razorpay as described above and are not stored on our infrastructure.</p>

          <h2>Choice / opt-out</h2>
          <p>If you have registered to receive email communications and later change your mind, you may contact us to have your name removed from our distribution lists.</p>
          <ul>
            <li>Email: <a href={`mailto:${site.email}`}>{site.email}</a></li>
            <li>Postal: MicroCharity, {site.address}</li>
          </ul>

          <h2>Correct / update</h2>
          <p>If you would like to verify the data we have received from you or to make corrections, contact us at the email or address above.</p>

          <h2>Anonymous & automatic information</h2>
          <p>Anonymous information is collected for every visitor — pages viewed, date and time, and browser type. IP numbers are not stored permanently but may be temporarily used to determine domain type and geographic region. We do not associate this information with a visitor&apos;s identity.</p>

          <h2>Cookies</h2>
          <p>Cookies are simple text files stored by your browser to distinguish among visitors. Cookies created on your computer by our website do not contain personally identifiable information and do not compromise your privacy or security. They allow us to gather anonymous information and to provide more relevant content.</p>

          <h2>Online registration</h2>
          <p>You may provide information about yourself and your organisation when you register for fundraising, donations, etc. This information is not used for any other purpose than to fulfil your request and is not shared with outside parties.</p>

          <h2>Links to other sites</h2>
          <p>This website may contain links to other websites. When you click on one of these links you are entering another site. We encourage you to read their privacy statements as they may differ from ours.</p>

          <h2>Email communications</h2>
          <p>We publish a periodic e-newsletter. You may subscribe to or unsubscribe from the email list at any time. Occasionally we may send announcements about MicroCharity events.</p>

          <h2>Changes to this policy</h2>
          <p>Changing business practices may require us to update this Privacy Policy from time to time. Any changes will be reflected on this page. MicroCharity reserves the right to modify its website and/or this Privacy Policy at any time.</p>

          <h2>Legal disclaimer</h2>
          <p>We may disclose personal information when required by law or in the good-faith belief that such action is necessary to comply with legal process served on MicroCharity.</p>

          <h2>For more information</h2>
          <p>If you have any questions, concerns or comments about privacy on our website, please email us at <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
        </div>
      </div>
    </>
  );
}

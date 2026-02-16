import MarketingLayout from "@/components/MarketingLayout";

const Privacy = () => {
  return (
    <MarketingLayout>
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-4xl font-bold font-heading text-foreground mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 16 February 2026</p>

        <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">1. Who We Are</h2>
            <p>Vintifi ("we", "us", "our") operates the website <strong>vintifi.com</strong> and the Vintifi platform. We are committed to protecting your personal data and your privacy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">2. Information We Collect</h2>
            <p>We collect and process the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account information:</strong> email address, display name, and authentication credentials when you sign up.</li>
              <li><strong>Profile data:</strong> selling categories, experience level, and goals you provide during onboarding.</li>
              <li><strong>Listing data:</strong> item details, photos, prices, and descriptions you add to the platform.</li>
              <li><strong>Third-party platform data:</strong> when you connect platforms such as eBay, we store OAuth tokens and platform identifiers to enable cross-listing features. We do not store your eBay password.</li>
              <li><strong>Usage data:</strong> feature usage counts, analytics, and interaction logs to improve the service.</li>
              <li><strong>Payment data:</strong> processed securely by Stripe. We do not store your full card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide, maintain, and improve the Vintifi platform and its features.</li>
              <li>To authenticate your identity and manage your account.</li>
              <li>To enable cross-platform listing and selling on connected marketplaces (e.g. eBay).</li>
              <li>To generate AI-powered pricing insights, listing optimisations, and trend analysis.</li>
              <li>To process payments and manage subscriptions.</li>
              <li>To send transactional emails (e.g. weekly digests, alerts) that you can opt out of.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services to deliver our platform:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>eBay APIs</strong> — cross-listing and marketplace integration</li>
              <li><strong>OpenAI / Google AI</strong> — AI-powered analysis and content generation</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
            </ul>
            <p>Each third-party service operates under its own privacy policy. We only share the minimum data necessary for each service to function.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">5. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide you with services. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">6. Your Rights (GDPR)</h2>
            <p>If you are located in the European Economic Area (EEA) or the United Kingdom, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access, correct, or delete your personal data.</li>
              <li>Object to or restrict processing of your data.</li>
              <li>Data portability — receive your data in a structured, machine-readable format.</li>
              <li>Withdraw consent at any time where processing is based on consent.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at <strong>privacy@vintifi.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">7. Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your personal data, including encryption in transit (TLS), row-level database security, and secure secret management for API credentials.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">8. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-heading mb-3">10. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <strong>privacy@vintifi.com</strong>.</p>
          </section>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default Privacy;

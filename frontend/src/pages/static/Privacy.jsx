import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/StaticPages.css';

export default function Privacy() {
  return (
    <>
      <Header />
      <main className="main-content">
        <section className="page-header">
          <div className="container">
            <h1>Privacy Policy</h1>
            <p className="subtitle">Last Updated: June 15, 2023</p>
          </div>
        </section>

        <section className="privacy-section">
          <div className="container">
            <div className="legal-content">
              <p className="intro-text">At CargoLink, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, mobile applications, or any other services provided by CargoLink (collectively, the "Services").</p>
              <p>Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access our Services.</p>
            
              <h2>1. Information We Collect</h2>
              <h3>Personal Information</h3>
              <p>We may collect personal information that you provide directly to us when you:</p>
              <ul>
                <li>Create an account or profile</li>
                <li>Request transportation services</li>
                <li>Contact our customer support</li>
                <li>Complete forms on our platform</li>
                <li>Participate in surveys or promotions</li>
              </ul>
              <p>This information may include:</p>
              <ul>
                <li>Name, email address, phone number, and business details</li>
                <li>Billing and payment information</li>
                <li>Shipping addresses and preferences</li>
                <li>User account credentials</li>
                <li>Communication records between you and CargoLink</li>
              </ul>

              <h3>Information We Collect Automatically</h3>
              <p>When you use our Services, we may automatically collect certain information, including:</p>
              <ul>
                <li>Device information (such as IP address, device type, operating system)</li>
                <li>Usage data (such as pages visited, features used, time spent on platform)</li>
                <li>Location data (with your consent, to facilitate transportation services)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>We may use the information we collect for various purposes, including to:</p>
              <ul>
                <li>Provide, maintain, and improve our Services</li>
                <li>Process and manage transportation requests</li>
                <li>Facilitate payments and transactions</li>
                <li>Communicate with you about our Services, updates, and promotions</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Enhance security and prevent fraud</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and troubleshoot problems</li>
              </ul>

              <h2>3. Information Sharing and Disclosure</h2>
              <p>We may share your information with:</p>
              <h3>Service Providers</h3>
              <p>We may share your information with third-party service providers who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.</p>

              <h3>Transport Service Providers</h3>
              <p>To facilitate transportation services, we share necessary information with transport service providers, including pickup/delivery locations, contact information, and shipping details.</p>

              <h3>Business Partners</h3>
              <p>We may share your information with business partners with whom we jointly offer products or services.</p>

              <h3>Legal Requirements</h3>
              <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, government requests).</p>

              <h3>Business Transfers</h3>
              <p>If CargoLink is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction.</p>

              <h2>4. Data Security</h2>
              <p>We implement appropriate security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>

              <h2>5. Your Privacy Rights</h2>
              <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul>
                <li>Access to your personal information</li>
                <li>Correction of inaccurate or incomplete information</li>
                <li>Deletion of your personal information</li>
                <li>Restriction or objection to processing</li>
                <li>Data portability</li>
                <li>Withdrawal of consent</li>
              </ul>
              <p>To exercise these rights, please contact us using the information provided at the end of this Privacy Policy.</p>

              <h2>6. Cookies and Tracking Technologies</h2>
              <p>We use cookies and similar tracking technologies to collect and track information about your use of our Services. You can set your browser to refuse all or some browser cookies or to alert you when cookies are being sent. However, some parts of our Services may not function properly without cookies.</p>

              <h2>7. Children's Privacy</h2>
              <p>Our Services are not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.</p>

              <h2>8. International Data Transfers</h2>
              <p>Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. If you are located outside India and choose to provide information to us, please note that we transfer the information to India and process it there.</p>

              <h2>9. Changes to this Privacy Policy</h2>
              <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. You are advised to review this Privacy Policy periodically for any changes.</p>

              <h2>10. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at:</p>
              <p>Email: <a href="mailto:privacy@cargolink.com">privacy@cargolink.com</a><br />
              Address: CargoLink Technologies Pvt Ltd, 123 Business Park, Mumbai - 400001, India<br />
              Phone: +91 22 1234 5678</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/StaticPages.css';

export default function Terms() {
  return (
    <>
      <Header />
      <main className="main-content">
        <section className="page-header">
          <div className="container">
            <h1>Terms of Service</h1>
            <p className="subtitle">Last Updated: June 15, 2023</p>
          </div>
        </section>

        <section className="terms-section">
          <div className="container">
            <div className="legal-content">
              <h2>1. Acceptance of Terms</h2>
              <p>By accessing or using the CargoLink platform, website, mobile applications, or any other services provided by CargoLink (collectively, the "Services"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Services.</p>
              <p>CargoLink reserves the right to modify these terms at any time. We will notify users of any significant changes through the platform or via email. Your continued use of our Services after such modifications constitutes your acceptance of the revised terms.</p>

              <h2>2. Description of Services</h2>
              <p>CargoLink provides a platform connecting businesses requiring logistics services with transport service providers. Our platform facilitates the arrangement of freight transportation, tracking of shipments, payment processing, and related services.</p>
              <p>CargoLink does not itself provide transportation services and is not a carrier. We are a technology platform that connects users with independent third-party transport providers.</p>

              <h2>3. User Accounts</h2>
              <p>To access certain features of our Services, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
              <p>You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify CargoLink immediately of any unauthorized use of your account or any other breach of security.</p>
              <p>CargoLink reserves the right to disable any user account if we believe you have violated any provisions of these Terms of Service.</p>

              <h2>4. User Conduct</h2>
              <p>You agree not to use the Services for any unlawful purpose or in any way that could damage, disable, overburden, or impair the operation of our platform. Specifically, you agree not to:</p>
              <ul>
                <li>Use the Services for any illegal activities or to transport illegal goods</li>
                <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity</li>
                <li>Interfere with or disrupt the Services or servers or networks connected to the Services</li>
                <li>Collect or store personal data about other users without their express consent</li>
                <li>Post or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable</li>
              </ul>

              <h2>5. Transport Services</h2>
              <p>When you arrange for transport services through our platform, you are entering into a contract directly with the transport service provider. CargoLink is not a party to this contract and does not assume any liability for the services provided by transport service providers.</p>
              <p>You acknowledge and agree that:</p>
              <ul>
                <li>CargoLink does not guarantee the quality, safety, or legality of transport services offered by providers</li>
                <li>CargoLink does not guarantee the accuracy of any information provided by transport service providers</li>
                <li>You are responsible for providing accurate information about the goods to be transported, including dimensions, weight, and any special handling requirements</li>
                <li>You are responsible for ensuring that all goods are properly packaged for transportation</li>
                <li>You must comply with all applicable laws and regulations regarding the transportation of goods</li>
              </ul>

              <h2>6. Fees and Payment</h2>
              <p>The use of our platform may involve various fees, including service fees, cancellation fees, and other charges as described on our website or mobile application. All fees are non-refundable unless otherwise specified.</p>
              <p>You agree to pay all fees and charges incurred in connection with your use of the Services. Payments may be processed through third-party payment processors, and you agree to comply with their terms and conditions.</p>
              <p>CargoLink reserves the right to change our fee structure at any time. We will notify users of any significant changes to our fees through the platform or via email.</p>

              <h2>7. Limitation of Liability</h2>
              <p>To the maximum extent permitted by applicable law, CargoLink and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your use of or inability to use the Services.</p>
              <p>In no event shall CargoLink's total liability to you for all claims arising out of or relating to the use of the Services exceed the amount paid by you to CargoLink during the six (6) month period prior to the date of the claim.</p>

              <h2>8. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless CargoLink and its officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) that such parties may incur as a result of or arising from your violation of these Terms of Service.</p>

              <h2>9. Intellectual Property</h2>
              <p>The Services and all content and materials included on or within the Services, including, but not limited to, text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, are the property of CargoLink or its licensors and are protected by copyright, trademark, and other intellectual property laws.</p>
              <p>You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Services for your personal or business use. You may not reproduce, distribute, display, sell, lease, transmit, create derivative works from, translate, modify, reverse-engineer, disassemble, decompile, or otherwise exploit the Services or any portion of them without the express written consent of CargoLink.</p>

              <h2>10. Termination</h2>
              <p>CargoLink reserves the right to terminate or suspend your account and access to the Services at any time, without notice and for any reason, including if we believe you have violated these Terms of Service.</p>
              <p>Upon termination, your right to use the Services will immediately cease. All provisions of these Terms of Service that by their nature should survive termination shall survive, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</p>

              <h2>11. Governing Law</h2>
              <p>These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
              <p>Any dispute arising out of or relating to these Terms of Service shall be subject to the exclusive jurisdiction of the courts located in Mumbai, India.</p>

              <h2>12. Contact Information</h2>
              <p>If you have any questions about these Terms of Service, please contact us at <a href="mailto:legal@cargolink.com">legal@cargolink.com</a> or through our Contact page.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

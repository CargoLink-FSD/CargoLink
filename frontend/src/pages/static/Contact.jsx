import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/StaticPages.css';

export default function Contact() {
  return (
    <>
      <Header />
      <main className="main-content">
        <section className="page-header">
          <div className="container">
            <h1>Contact Us</h1>
            <p className="subtitle">We're Here to Help</p>
          </div>
        </section>

        <section className="contact-section">
          <div className="container">
            <div className="contact-grid">
              <div className="contact-info">
                <h2>Get in Touch</h2>
                <p>Have questions about our services or need assistance with your logistics needs? Our team is ready to help you find the right solutions.</p>
                
                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div className="contact-details">
                      <h3>Phone</h3>
                      <p>Customer Support: <a href="tel:+911234567890">+91 1234 567 890</a></p>
                      <p>Business Inquiries: <a href="tel:+911234567891">+91 1234 567 891</a></p>
                    </div>
                  </div>
                  
                  <div className="contact-method">
                    <div className="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div className="contact-details">
                      <h3>Email</h3>
                      <p>General Inquiries: <a href="mailto:info@cargolink.com">info@cargolink.com</a></p>
                      <p>Customer Support: <a href="mailto:support@cargolink.com">support@cargolink.com</a></p>
                      <p>Business Development: <a href="mailto:business@cargolink.com">business@cargolink.com</a></p>
                    </div>
                  </div>
                  
                  <div className="contact-method">
                    <div className="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div className="contact-details">
                      <h3>Location</h3>
                      <p>CargoLink Headquarters</p>
                      <p>123 Business Park, Andheri East</p>
                      <p>Mumbai, Maharashtra 400069</p>
                      <p>India</p>
                    </div>
                  </div>
                  
                  <div className="contact-method">
                    <div className="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className="contact-details">
                      <h3>Business Hours</h3>
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 2:00 PM</p>
                      <p>Sunday: Closed</p>
                      <p>Customer Support: 24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="map-section">
          <div className="container">
            <h2>Find Us</h2>
            <div className="map-container">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.74110193988097!3d19.082197839429343!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1655987267522!5m2!1sen!2sin" 
                width="100%" 
                height="450" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="CargoLink Location"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

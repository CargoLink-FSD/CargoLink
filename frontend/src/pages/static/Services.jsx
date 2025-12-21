import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/StaticPages.css';

export default function Careers() {
  return (
    <>
      <Header />
      <main className="main-content">
        <section className="page-header">
          <div className="container">
            <h1>Our Services</h1>
            <p className="subtitle">Comprehensive Logistics Solutions for Your Business</p>
          </div>
        </section>

        <section className="services-overview">
          <div className="container">
            <p className="lead-text">At CargoLink, we offer a range of logistics services designed to meet the diverse needs of businesses across industries. Whether you're a small business shipping occasionally or a large enterprise with complex supply chain requirements, we have solutions tailored for you.</p>
          </div>
        </section>

        <section className="services-grid">
          <div className="container">
            <div className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <h2>Full Truckload (FTL) Transportation</h2>
              <p>Dedicated truck service for larger shipments requiring the full capacity of a truck. Ideal for time-sensitive deliveries and high-volume shipments.</p>
              <ul className="service-features">
                <li>Direct point-to-point delivery</li>
                <li>Faster transit times</li>
                <li>Reduced handling and risk of damage</li>
                <li>Available for various truck types and sizes</li>
                <li>Real-time tracking and monitoring</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h2>Less Than Truckload (LTL) Shipping</h2>
              <p>Cost-effective solution for smaller shipments that don't require an entire truck. Share truck space with other shippers to reduce costs.</p>
              <ul className="service-features">
                <li>Economical for smaller shipments</li>
                <li>Flexible scheduling options</li>
                <li>Wide geographical coverage</li>
                <li>Simplified pricing structure</li>
                <li>Consolidated tracking system</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </div>
              <h2>Specialized Cargo Handling</h2>
              <p>Expert handling for unique cargo types requiring special care, equipment, or compliance with specific regulations.</p>
              <ul className="service-features">
                <li>Temperature-controlled transportation</li>
                <li>Hazardous materials handling</li>
                <li>Oversized and heavy cargo transport</li>
                <li>Fragile goods handling</li>
                <li>Compliance with industry-specific regulations</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7" y2="7" />
                </svg>
              </div>
              <h2>Last Mile Delivery</h2>
              <p>Ensure your products reach the final destination quickly and efficiently with our last-mile delivery service, crucial for e-commerce businesses.</p>
              <ul className="service-features">
                <li>Scheduled delivery windows</li>
                <li>Real-time tracking for end customers</li>
                <li>Proof of delivery documentation</li>
                <li>Specialized urban delivery solutions</li>
                <li>Return management capabilities</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="8" width="20" height="12" rx="2" ry="2" />
                  <circle cx="5" cy="14" r="2" />
                  <circle cx="17" cy="14" r="2" />
                  <path d="M14 8V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
              <h2>Express Delivery</h2>
              <p>Urgent shipment service with guaranteed delivery times for time-critical consignments. Fastest available transportation for your highest priority goods.</p>
              <ul className="service-features">
                <li>Same-day and next-day delivery options</li>
                <li>Priority handling and routing</li>
                <li>Dedicated customer support</li>
                <li>Time-definite delivery guarantees</li>
                <li>Specialized express transport fleet</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h2>Warehouse Services</h2>
              <p>Flexible warehousing solutions designed to help you manage inventory, improve fulfillment operations, and reduce overall logistics costs.</p>
              <ul className="service-features">
                <li>Short and long-term storage options</li>
                <li>Inventory management systems</li>
                <li>Order fulfillment services</li>
                <li>Cross-docking capabilities</li>
                <li>Distribution and consolidation services</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="industries-section">
          <div className="container">
            <h2 className="section-title">Industries We Serve</h2>
            <div className="industries-grid">
              <div className="industry-card">
                <h3>Retail & E-commerce</h3>
                <p>Tailored solutions for traditional retail and e-commerce businesses, including last-mile delivery, reverse logistics, and seasonal capacity planning.</p>
              </div>
              <div className="industry-card">
                <h3>Manufacturing</h3>
                <p>Supply chain solutions for manufacturers, from raw material delivery to finished product distribution, with just-in-time delivery options.</p>
              </div>
              <div className="industry-card">
                <h3>Food & Beverage</h3>
                <p>Specialized transportation for perishable goods with temperature-controlled vehicles and expedited delivery to maintain freshness.</p>
              </div>
              <div className="industry-card">
                <h3>Pharmaceuticals</h3>
                <p>Compliant transportation for medical supplies and pharmaceuticals, with strict adherence to regulatory requirements and temperature controls.</p>
              </div>
              <div className="industry-card">
                <h3>Construction</h3>
                <p>Heavy-duty logistics solutions for construction materials, equipment, and oversized cargo transport to job sites.</p>
              </div>
              <div className="industry-card">
                <h3>Agriculture</h3>
                <p>Reliable transportation for agricultural products from farms to processing facilities and distribution centers.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container">
            <h2>Ready to Simplify Your Logistics?</h2>
            <p>Contact us today to discuss your specific requirements and learn how CargoLink can optimize your supply chain.</p>
            <Link to="/static/contact" className="btn btn-primary">Get in Touch</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

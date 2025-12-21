import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/StaticPages.css';

export default function About() {
  return (
    <>
      <Header />
      <main className="main-content">
        <section className="page-header">
          <div className="container">
            <h1>About CargoLink</h1>
            <p className="subtitle">Building the Future of Logistics</p>
          </div>
        </section>

        <section className="about-section">
          <div className="container">
            <div className="about-grid">
              <div className="about-content">
                <h2>Our Story</h2>
                <p>Founded in 2023, CargoLink was born from a simple observation: the logistics industry needed a modern, digital transformation.</p>
                <p>Our founders, with decades of combined experience in transportation and technology, set out to create a platform that would connect businesses with reliable transport solutions, making logistics simpler, faster, and more efficient.</p>
                <p>Today, CargoLink is a leading logistics platform serving thousands of customers across India, with a network of trusted transporters helping businesses of all sizes move their goods efficiently.</p>
                
                <h2>Our Mission</h2>
                <p>To simplify logistics by connecting businesses with reliable transport solutions through technology, ensuring efficient, transparent, and cost-effective delivery of goods.</p>
                
                <h2>Our Vision</h2>
                <p>To become the most trusted logistics platform in Asia, known for reliability, transparency, and exceptional service.</p>
              </div>
              <div className="about-image">
                
              </div>
            </div>
          </div>
        </section>

        <section className="values-section">
          <div className="container">
            <h2 className="section-title">Our Core Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                    <path d="M10 6h4"/>
                    <path d="M10 10h4"/>
                    <path d="M10 14h4"/>
                    <path d="M10 18h4"/>
                  </svg>
                </div>
                <h3>Reliability</h3>
                <p>We deliver on our promises, every time. Our customers and transport partners count on us for consistent, dependable service.</p>
              </div>
              <div className="value-card">
                <div className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <h3>Safety</h3>
                <p>We prioritize the safety of goods, drivers, and everyone involved in the logistics process. Safety is never compromised.</p>
              </div>
              <div className="value-card">
                <div className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3>Efficiency</h3>
                <p>We continually optimize our processes to save time, reduce costs, and maximize resource utilization for our customers and partners.</p>
              </div>
              <div className="value-card">
                <div className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>Transparency</h3>
                <p>We believe in open, honest communication with our customers, partners, and employees. Our pricing, processes, and progress tracking are always clear.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="team-section">
          <div className="container">
            <h2 className="section-title">Meet The Team</h2>
            <div className="team-grid">
              <div className="team-member">
                
                <h3>Ragavan</h3>
                <p className="member-title"></p>
                <p>With 15+ years in logistics and supply chain management, Vikram brings strategic vision and industry expertise to CargoLink.</p>
              </div>
              <div className="team-member">
                
                <h3>Dharshan</h3>
                <p className="member-title">Chief Executive Officer</p>
                <p>With 15+ years in logistics and supply chain management, Vikram brings strategic vision and industry expertise to CargoLink.</p>
              </div>
              <div className="team-member">
                
                <h3>Muthuraja S</h3>
                <p className="member-title">Chief Executive Officer</p>
                <p>With 15+ years in logistics and supply chain management, Vikram brings strategic vision and industry expertise to CargoLink.</p>
              </div>
            </div>
            <div className="team-grid2">
              <div className="team-member">
                
                <h3>Ankit</h3>
                <p className="member-title">Chief Technology Officer</p>
                <p>Priya leads our technology initiatives, bringing 12+ years of experience in building scalable platforms and innovative solutions.</p>
              </div>
              <div className="team-member">
                
                <h3>Trishant</h3>
                <p className="member-title">Chief Operations Officer</p>
                <p>Ajay oversees daily operations, ensuring smooth execution of logistics services with his 10+ years of operational expertise.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

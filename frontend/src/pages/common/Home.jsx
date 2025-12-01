import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useParallax } from '../../hooks/useHome';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/Home.css';

import feat1 from '../../assets/images/features/features-1.jpg';
import feat2 from '../../assets/images/features/features-2.jpg';
import feat3 from '../../assets/images/features/features-3.jpg';
import mrM from '../../assets/images/Mr.M.jpg';
import mrH from '../../assets/images/profile.webp';

function Home() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userType = user?.role;
  
  useParallax();

  return (
    <>
      <Header />
      
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Connecting Customers and Transporters</h1>
            <p>
              CargoLink brings businesses and transporters together on one seamless platform,
              making logistics simpler, faster, and more efficient.
            </p>
            
            <div className="button-group">
              {!isAuthenticated ? (
                <>
                    <Link to="/customer/signup" className="btn btn-gradient">
                    Sign up Now
                  </Link>
                    <Link to="/transporter/signup" className="btn btn-gradient-outline">
                    Join as Transporter
                  </Link>
                </>
              ) : userType === 'customer' ? (
                <Link to="/customer/place-order" className="btn btn-gradient">
                  Ship Now
                </Link>
              ) : userType === 'transporter' ? (
                <Link to="/transporter/bid" className="btn btn-gradient">
                  Bid Now
                </Link>
              ) : userType === 'admin' ? (
                <Link to="/admin/dashboard" className="btn btn-gradient">
                  Dashboard
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="features">
          <h2 className="section-title">Why Choose CargoLink?</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-image">
                <img src={feat1} alt="Easy Shipment Booking" loading="lazy" />
              </div>
              <div className="feature-content">
                <h3>Easy Shipment Booking</h3>
                <p>
                  Post shipment requests with detailed information about pick-up/drop-off 
                  locations, load details and budget in minutes.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-image">
                <img src={feat2} alt="Competitive Bidding System" loading="lazy" />
              </div>
              <div className="feature-content">
                <h3>Competitive Bidding System</h3>
                <p>
                  Get the best rates for your shipments through our transparent bidding system.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-image">
                <img src={feat3} alt="Verified Transporters Network" loading="lazy" />
              </div>
              <div className="feature-content">
                <h3>Verified Transporters</h3>
                <p>
                  All transporters undergo thorough verification of licenses, vehicles, 
                  and past performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="testimonials">
          <h2 className="section-title">What Our Users Say</h2>
          <div className="testimonial-grid">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-image">
                  <img src={mrM} alt="Muthuraja S" loading="lazy" />
                </div>
                <div>
                  <h4>Muthuraja S</h4>
                  <p>Global Logistics Inc.</p>
                </div>
              </div>
              <blockquote>
                "CargoLink has transformed how we manage our shipments. 
                The real-time tracking is invaluable."
              </blockquote>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-image">
                  <img src={mrH} alt="Hari Ragav" loading="lazy" />
                </div>
                <div>
                  <h4>Hari Ragav</h4>
                  <p>FastFreight Solutions</p>
                </div>
              </div>
              <blockquote>
                "The bidding system helps us find the best rates while ensuring quality service."
              </blockquote>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>  );
}

export default Home;

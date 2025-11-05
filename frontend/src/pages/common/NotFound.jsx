import { Link } from 'react-router-dom';
import '../../styles/NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>The page you are looking for could not be found.</p>
      <Link className="btn btn-gradient" to="/">
        Back to Home
      </Link>
    </div>
  );
}

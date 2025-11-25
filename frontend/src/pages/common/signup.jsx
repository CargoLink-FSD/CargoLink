import AuthLayout from '../../components/auth/AuthLayout';
import { Link } from 'react-router-dom';
import { useAuthSignup } from '../../hooks/auth/useAuthSignup';
import CustomerSignupForm from './CustomerSignupForm';
import TransporterSignupForm from './TransporterSignupForm';
import '../../components/forms/forms.css';
import '../../styles/Signup.css';

function Signup() {
  const state = useAuthSignup();
  const { userType } = state;

  return (
    <AuthLayout
      title={userType === 'transporter' ? 'Create Transporter Account' : 'Create Account'}
      subtitle={`Sign up to join CargoLink as ${userType === 'customer' ? 'a Customer' : 'a Transport Partner'}`}
    >
      {userType === 'customer' ? (
        <CustomerSignupForm state={state} />
      ) : (
        <TransporterSignupForm state={state} />
      )}
      <p className="login-text">
        Already have an account?{' '}
        <Link className="link" to={`/login?type=${userType}`}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;

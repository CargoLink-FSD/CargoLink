import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../hooks/auth/useForgotPassword';
import Alert from '../../components/auth/AuthUI';
import AuthLayout from '../../components/auth/AuthLayout';
import { InputField, Button } from '../../components/forms';
import '../../styles/Login.css';

function ForgotPassword() {
  const {
    formData,
    userType,
    successMessage,
    loading,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    navigate,
  } = useForgotPassword();

  return (
    <AuthLayout 
      title="Forgot Password"
      subtitle="Enter your email to reset your password"
    >
      {successMessage && <Alert message={successMessage} type="success" />}

      <form onSubmit={handleSubmit} id="forgotPasswordForm">
        {/* Email Field */}
        <InputField
          type="email"
          id="email"
          name="email"
          label="Email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email ? errors.email : ''}
          required
        />

        {/* Buttons */}
        <div className="buttons">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/login?type=${userType}`)}
          >
            Back to Login
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={loading}
            loading={loading}
          >
            Send New Password
          </Button>
        </div>
      </form>

      <p className="register-text">
        Remembered your password?{' '}
        <Link className="link" to={`/login?type=${userType}`}>
          Login now
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;

import { useState, useCallback } from 'react';

export const usePasswordToggles = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleShowPassword = useCallback(() => setShowPassword((s) => !s), []);
  const toggleShowConfirmPassword = useCallback(() => setShowConfirmPassword((s) => !s), []);

  const resetPasswordToggles = useCallback(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  return {
    showPassword,
    showConfirmPassword,
    toggleShowPassword,
    toggleShowConfirmPassword,
    resetPasswordToggles,
  };
};

export default usePasswordToggles;

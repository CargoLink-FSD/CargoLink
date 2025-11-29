// Custom hook for managing multi-step form navigation
import { useState, useCallback } from 'react';

export const useStepForm = (totalSteps = 1) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Check if can proceed to next step
  const canGoNext = useCallback((validator) => {
    if (typeof validator === 'function') {
      return validator(currentStep);
    }
    return true;
  }, [currentStep]);

  // Move to next step
  const nextStep = useCallback((validator) => {
    if (canGoNext(validator)) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps));
    }
  }, [canGoNext, totalSteps]);

  // Move to previous step
  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  // Reset to first step
  const resetSteps = useCallback(() => setCurrentStep(1), []);

  return { currentStep, totalSteps, nextStep, prevStep, resetSteps };
};

export default useStepForm;

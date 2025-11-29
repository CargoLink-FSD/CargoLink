import React from 'react';

const ProgressSteps = ({ current, total }) => {
  const steps = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="progress-container">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={`progress-step ${current === step ? 'active' : ''} ${current > step ? 'completed' : ''}`}
          >
            {step}
          </div>
          {index < total - 1 && (
            <div className={`progress-line ${current > step ? 'active' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressSteps;

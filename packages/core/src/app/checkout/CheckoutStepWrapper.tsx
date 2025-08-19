import React, { ComponentType } from 'react';
import { useInsuranceCache } from '../order/InsuranceCacheContext';
import CheckoutStep, { CheckoutStepProps } from './CheckoutStep';

interface CheckoutStepWrapperProps extends CheckoutStepProps {
  // Add any additional props if needed
}

const CheckoutStepWrapper: ComponentType<CheckoutStepWrapperProps> = (props) => {
  const { 
    setCachedInsuranceAmount, 
    setIsInsuranceTransitioning, 
    setLastOperation,
    setCachedTotalWithInsurance,
    setCachedTotalWithoutInsurance
  } = useInsuranceCache();

  // Pass the context methods to the CheckoutStep component
  return (
    <CheckoutStep
      {...props}
      setCachedInsuranceAmount={setCachedInsuranceAmount}
      setIsInsuranceTransitioning={setIsInsuranceTransitioning}
      setLastOperation={setLastOperation}
      setCachedTotalWithInsurance={setCachedTotalWithInsurance}
      setCachedTotalWithoutInsurance={setCachedTotalWithoutInsurance}
    />
  );
};

export default CheckoutStepWrapper; 
import React from 'react';
import Payment, { PaymentProps } from './Payment';

const PaymentWithValidation: React.FC<PaymentProps> = (props) => {
  return <Payment {...props} />;
};

export default PaymentWithValidation;

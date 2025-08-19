import React, { createContext, useContext, useState, ReactNode } from 'react';

interface InsuranceCacheContextType {
  cachedInsuranceAmount: number;
  isInsuranceTransitioning: boolean;
  lastOperation: 'add' | 'remove' | null;
  // Pre-calculated totals for both states
  cachedTotalWithInsurance: number;
  cachedTotalWithoutInsurance: number;
  setCachedInsuranceAmount: (amount: number) => void;
  setIsInsuranceTransitioning: (transitioning: boolean) => void;
  setLastOperation: (operation: 'add' | 'remove' | null) => void;
  setCachedTotalWithInsurance: (total: number) => void;
  setCachedTotalWithoutInsurance: (total: number) => void;
  clearInsuranceCache: () => void;
}

const InsuranceCacheContext = createContext<InsuranceCacheContextType | undefined>(undefined);

interface InsuranceCacheProviderProps {
  children: ReactNode;
}

export const InsuranceCacheProvider: React.FC<InsuranceCacheProviderProps> = ({ children }) => {
  const [cachedInsuranceAmount, setCachedInsuranceAmount] = useState<number>(0);
  const [isInsuranceTransitioning, setIsInsuranceTransitioning] = useState<boolean>(false);
  const [lastOperation, setLastOperation] = useState<'add' | 'remove' | null>(null);
  const [cachedTotalWithInsurance, setCachedTotalWithInsurance] = useState<number>(0);
  const [cachedTotalWithoutInsurance, setCachedTotalWithoutInsurance] = useState<number>(0);

  const clearInsuranceCache = () => {
    setCachedInsuranceAmount(0);
    setIsInsuranceTransitioning(false);
    setLastOperation(null);
    setCachedTotalWithInsurance(0);
    setCachedTotalWithoutInsurance(0);
  };

  return (
    <InsuranceCacheContext.Provider
      value={{
        cachedInsuranceAmount,
        isInsuranceTransitioning,
        lastOperation,
        cachedTotalWithInsurance,
        cachedTotalWithoutInsurance,
        setCachedInsuranceAmount,
        setIsInsuranceTransitioning,
        setLastOperation,
        setCachedTotalWithInsurance,
        setCachedTotalWithoutInsurance,
        clearInsuranceCache,
      }}
    >
      {children}
    </InsuranceCacheContext.Provider>
  );
};

export const useInsuranceCache = (): InsuranceCacheContextType => {
  const context = useContext(InsuranceCacheContext);
  if (context === undefined) {
    throw new Error('useInsuranceCache must be used within an InsuranceCacheProvider');
  }
  return context;
}; 
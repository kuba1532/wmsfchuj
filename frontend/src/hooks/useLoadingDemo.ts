import { useState, useEffect } from 'react';

const useLoadingDemo = (durationMs: number = 1500) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return isLoading;
};

export default useLoadingDemo;

import { useEffect, useRef, useState } from 'react';

export function useAutoRefresh(
  callback: () => void | Promise<void>,
  interval: number = 5000,
  enabled: boolean = true
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const executeCallback = async () => {
      setIsRefreshing(true);
      try {
        await callbackRef.current();
      } finally {
        setIsRefreshing(false);
      }
    };

    executeCallback();

    const intervalId = setInterval(executeCallback, interval);

    return () => clearInterval(intervalId);
  }, [interval, enabled]);

  return { isRefreshing };
}

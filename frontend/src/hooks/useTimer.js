import { useState, useEffect, useRef } from 'react';

export function useTimer(totalSeconds, onExpire) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const start = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const reset = (seconds) => {
    stop();
    setRemaining(seconds ?? totalSeconds);
  };

  useEffect(() => () => stop(), []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isWarning = remaining < 300;
  const isCritical = remaining < 60;
  const percentage = Math.round((remaining / totalSeconds) * 100);

  return { remaining, formatted, isWarning, isCritical, percentage, start, stop, reset };
}

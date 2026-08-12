import React, { useState, useEffect } from 'react';

const AnimatedCounter = ({ value, duration = 1000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let numericVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
    if (isNaN(numericVal)) {
      setCount(value);
      return;
    }

    let start = 0;
    const end = numericVal;
    const stepTime = Math.abs(Math.floor(duration / (end || 1)));
    const actualStep = Math.max(1, Math.ceil(end / 30));

    let timer = setInterval(() => {
      start += actualStep;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, Math.max(16, stepTime));

    return () => clearInterval(timer);
  }, [value, duration]);

  if (typeof value !== 'number' && isNaN(parseFloat(String(value).replace(/[^0-9.-]+/g, '')))) {
    return <span>{value}</span>;
  }

  const isFloat = String(value).includes('.');
  const formatted = isFloat ? count.toFixed(1) : count.toLocaleString();

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
};

export default AnimatedCounter;

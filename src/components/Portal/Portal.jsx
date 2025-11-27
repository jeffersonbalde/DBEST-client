import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Prevent body scroll when portal is mounted
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    children,
    document.body
  );
};

export default Portal;


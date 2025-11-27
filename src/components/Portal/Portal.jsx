import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

const Portal = ({ children, containerId = 'portal-root' }) => {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    let portalContainer = document.getElementById(containerId);
    
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      document.body.appendChild(portalContainer);
    }
    
    setContainer(portalContainer);

    return () => {
      if (portalContainer && portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
    };
  }, [containerId]);

  return container ? createPortal(children, container) : null;
};

export default Portal;


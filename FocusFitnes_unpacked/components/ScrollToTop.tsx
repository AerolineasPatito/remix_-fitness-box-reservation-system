import { useEffect, type FC } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop: FC = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname, search, hash]);

  return null;
};

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top when the page (not just the query string) changes. */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
};

export default ScrollToTop;

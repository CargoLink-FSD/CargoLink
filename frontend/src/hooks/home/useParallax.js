import { useEffect } from 'react';

/**
 * Custom hook to add parallax effect to hero section
 */
export function useParallax() {
  useEffect(() => {
    const hero = document.querySelector('.hero');
    
    if (!hero) return;

    const handleScroll = () => {
      const scrolled = window.scrollY;
      hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}

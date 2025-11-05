import { useEffect } from 'react';

export function useHeaderScroll() {
  useEffect(() => {
    let lastScroll = 0;
    const header = document.querySelector('.header');

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      
      if (header) {
        if (currentScroll > lastScroll && currentScroll > 100) {
          // Scrolling down - hide header
          header.style.transform = 'translateY(-100%)';
        } else {
          // Scrolling up - show header
          header.style.transform = 'translateY(0)';
        }
      }
      
      lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}

import { useState, useEffect } from 'react';

export function useHeaderScroll() {
  useEffect(() => {
    let lastScroll = 0;
    const header = document.querySelector('.header');

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      
      if (header) {
        if (currentScroll > lastScroll && currentScroll > 100) {
          header.style.transform = 'translateY(-100%)';
        } else {
          header.style.transform = 'translateY(0)';
        }
      }
      
      lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}

export function useParallax() {
  useEffect(() => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const handleScroll = () => {
      const scrolled = window.scrollY;
      hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}

export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isOpen]);

  return { isOpen, toggle, close };
}

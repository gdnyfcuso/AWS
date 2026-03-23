/**
 * Mobile device detection hook
 * Detects if the user is on a mobile device and provides responsive utilities
 */

import { useState, useEffect } from 'react';

export interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

const isMobileUserAgent = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Common mobile device patterns
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Mobile/i,
    /Windows Phone/i,
  ];

  return mobilePatterns.some(pattern => pattern.test(userAgent));
};

const isTouchDevice = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

export function useMobileDetection(): MobileDetectionResult {
  const [state, setState] = useState<MobileDetectionResult>(() => {
    // Initial server-side safe defaults
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: 1920,
      screenHeight: 1080,
      orientation: 'landscape',
    };
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobileUA = isMobileUserAgent();
      const touch = isTouchDevice();

      // Screen size breakpoints
      const isMobileSize = width < 768;
      const isTabletSize = width >= 768 && width < 1024;

      // Combined detection (UA + screen size + touch)
      const isMobile = mobileUA || (touch && isMobileSize);
      const isTablet = !isMobile && isTabletSize;
      const isDesktop = !isMobile && !isTablet;

      setState({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
      });
    };

    // Initial detection
    updateDetection();

    // Listen for resize events
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return state;
}

/**
 * Helper hook to get responsive class names
 */
export function useResponsiveClasses() {
  const { isMobile, isTablet } = useMobileDetection();

  return {
    // Grid columns
    mainGridCols: isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'xl:grid-cols-2',
    agentListGridCols: isMobile ? 'grid-cols-1' : 'lg:grid-cols-3',

    // Spacing
    containerPadding: isMobile ? 'px-2 py-4' : 'px-4 sm:px-6 lg:px-8 py-8',
    cardPadding: isMobile ? 'p-3' : 'p-6',

    // Font sizes
    pageTitle: isMobile ? 'text-xl' : 'text-2xl',
    sectionTitle: isMobile ? 'text-base' : 'text-lg',

    // 3D View height
    view3dHeight: isMobile ? '50vh' : '70vh',

    // Button sizes
    buttonText: isMobile ? 'text-sm' : 'text-base',
    buttonPadding: isMobile ? 'px-3 py-1.5' : 'px-4 py-2',
  };
}

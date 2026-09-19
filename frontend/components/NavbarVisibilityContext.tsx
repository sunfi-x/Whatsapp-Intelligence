'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavbarVisibilityContextValue {
  /** When true, the global Navbar hides itself on mobile (< lg) */
  hiddenOnMobile: boolean;
  setHiddenOnMobile: (value: boolean) => void;
}

const NavbarVisibilityContext = createContext<NavbarVisibilityContextValue>({
  hiddenOnMobile: false,
  setHiddenOnMobile: () => {},
});

export const NavbarVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hiddenOnMobile, setHiddenOnMobileState] = useState(false);

  const setHiddenOnMobile = useCallback((value: boolean) => {
    setHiddenOnMobileState(value);
  }, []);

  return (
    <NavbarVisibilityContext.Provider value={{ hiddenOnMobile, setHiddenOnMobile }}>
      {children}
    </NavbarVisibilityContext.Provider>
  );
};

export const useNavbarVisibility = () => useContext(NavbarVisibilityContext);

// Theme tokens consumed by styled components.
import React, { createContext, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

// Every key the styled components actually read. Missing keys resolve to
// `undefined`, which silently produced invisible panels.
const lightTheme = {
  name: 'light',
  background: '#f9f9f9',
  text: '#333',
  bgDark: '#eef0f4',
  textLight: '#1c2233',
  glassBg: 'rgba(255, 255, 255, 0.72)',
  shadowDark: 'rgba(29, 34, 51, 0.14)',
  shadowLight: 'rgba(255, 255, 255, 0.65)',
  primary: '#419D78',
  secondary: '#2D3047',
};

const darkTheme = {
  name: 'dark',
  background: '#1b1e2b',
  text: '#f9f9f9',
  bgDark: '#1b1e2b',
  textLight: '#f4f5f9',
  glassBg: 'rgba(45, 48, 71, 0.75)',
  shadowDark: 'rgba(0, 0, 0, 0.45)',
  shadowLight: 'rgba(255, 255, 255, 0.08)',
  primary: '#419D78',
  secondary: '#9aa5c4',
};

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(darkTheme);

  const toggleTheme = () => {
    setTheme((current) => (current.name === 'dark' ? lightTheme : darkTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

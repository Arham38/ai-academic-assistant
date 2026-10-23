import { useContext } from 'react';
import { ThemeContext, ThemeProviderState } from '../app/providers/ThemeProvider';

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

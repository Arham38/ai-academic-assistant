import { useContext } from 'react';
import { ThemeContext, ThemeProviderState, initialState } from '../app/providers/ThemeProvider';

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeContext);
  return context ?? initialState;
};

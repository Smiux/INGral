import { useContext } from 'react';
import { NavigatorContext, type NavigatorContextType } from './NavigatorContext';

export function useNavigator (): NavigatorContextType {
  const ctx = useContext(NavigatorContext);
  if (!ctx) {
    throw new Error('useNavigator must be used within NavigatorProvider');
  }
  return ctx;
}

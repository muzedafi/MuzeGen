// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * A custom hook to manage user authentication state throughout the application.
 * It listens for changes in the auth state from the authService.
 */
export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true, // Start in a loading state to check for a session
  });

  useEffect(() => {
    // The onAuthStateChanged function from our service will handle everything.
    // It returns an unsubscribe function which will be called on cleanup.
    const unsubscribe = authService.onAuthStateChanged(user => {
      setAuthState({ user, loading: false });
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return authState;
};

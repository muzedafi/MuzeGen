// services/authService.ts

/**
 * @file This file simulates a real authentication service like Firebase or Auth0.
 * The functions here are designed to be replaced with actual SDK calls.
 * For now, it uses localStorage to persist a mock user session.
 */

interface User {
  email: string;
}

const USER_STORAGE_KEY = 'genovaUserEmail'; // Using the existing key for continuity

// A map to store listeners for auth state changes.
const authStateListeners = new Map<string, (user: User | null) => void>();
let listenerIdCounter = 0;

const notifyListeners = (user: User | null) => {
  authStateListeners.forEach(callback => callback(user));
};

export const authService = {
  /**
   * Simulates a login process. In a real app, this would call Firebase/Auth0.
   * @param email The user's email.
   * @returns A promise that resolves with the user object.
   */
  login: async (email: string): Promise<User> => {
    // Simulate network delay
    await new Promise(res => setTimeout(res, 500));
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Invalid email format.');
    }

    const user: User = { email };
    localStorage.setItem(USER_STORAGE_KEY, user.email);
    notifyListeners(user);
    return user;
  },

  /**
   * Simulates a logout process.
   * @returns A promise that resolves when logout is complete.
   */
  logout: async (): Promise<void> => {
    // Simulate network delay
    await new Promise(res => setTimeout(res, 300));
    localStorage.removeItem(USER_STORAGE_KEY);
    notifyListeners(null);
  },

  /**
   * Gets the currently signed-in user from localStorage.
   * In a real app, this might be a synchronous check of the auth instance.
   * @returns The user object or null if not signed in.
   */
  getCurrentUser: (): User | null => {
    const email = localStorage.getItem(USER_STORAGE_KEY);
    return email ? { email } : null;
  },

  /**
   * Simulates the onAuthStateChanged listener from Firebase.
   * It allows components to subscribe to authentication state changes.
   * @param callback The function to call when the auth state changes.
   * @returns An unsubscribe function.
   */
  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    const id = `listener_${listenerIdCounter++}`;
    authStateListeners.set(id, callback);
    
    // Immediately invoke callback with current state
    callback(authService.getCurrentUser());

    // Return an unsubscribe function
    return () => {
      authStateListeners.delete(id);
    };
  },
};

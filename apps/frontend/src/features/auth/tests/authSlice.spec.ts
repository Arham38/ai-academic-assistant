import { describe, it, expect } from 'vitest';
import { authReducer, setCredentials, setUser, logOut, AuthState } from '../authSlice';

describe('authSlice reducer', () => {
  const initialAuthState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
  };

  it('should return initial state when passed an empty action', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialAuthState);
  });

  it('should handle setCredentials with user and token', () => {
    const user = {
      id: 'usr_123',
      email: 'student@mit.edu',
      role: 'STUDENT',
      firstName: 'Alan',
      lastName: 'Turing',
    };
    const token = 'jwt.access.token';

    const actual = authReducer(initialAuthState, setCredentials({ user, token }));

    expect(actual.token).toBe(token);
    expect(actual.user).toEqual(user);
    expect(actual.isAuthenticated).toBe(true);
  });

  it('should preserve existing user when setCredentials is called with token only', () => {
    const existingState: AuthState = {
      user: {
        id: 'usr_123',
        email: 'student@mit.edu',
        role: 'STUDENT',
      },
      token: 'old.token',
      isAuthenticated: true,
    };

    const actual = authReducer(existingState, setCredentials({ token: 'new.token' }));

    expect(actual.token).toBe('new.token');
    expect(actual.user).toEqual(existingState.user);
    expect(actual.isAuthenticated).toBe(true);
  });

  it('should handle setUser', () => {
    const newUser = {
      id: 'usr_456',
      email: 'ada@lovelace.org',
      role: 'RESEARCHER',
    };

    const actual = authReducer(initialAuthState, setUser(newUser));

    expect(actual.user).toEqual(newUser);
  });

  it('should handle logOut and reset all state to null', () => {
    const loggedInState: AuthState = {
      user: {
        id: 'usr_123',
        email: 'student@mit.edu',
        role: 'STUDENT',
      },
      token: 'valid.token',
      isAuthenticated: true,
    };

    const actual = authReducer(loggedInState, logOut());

    expect(actual).toEqual(initialAuthState);
  });
});

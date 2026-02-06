// Authentication utility functions

/**
 * Handle authentication errors consistently across the app
 * Clears invalid tokens and redirects to login
 */
export function handleAuthError(status: number, router: any) {
  if (status === 401 || status === 404) {
    // Clear invalid/expired tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Show helpful message
    if (status === 404) {
      // User account doesn't exist (deleted or reset)
      const message = 'Your account was not found. This may happen if:\n' +
                     '- Your account was deleted\n' +
                     '- The database was reset\n' +
                     '- You\'re using an old session\n\n' +
                     'Please register or log in again.';
      alert(message);
    } else if (status === 401) {
      // Invalid or expired token
      alert('Your session has expired. Please log in again.');
    }
    
    // Redirect to login
    router.push('/login');
    return true;
  }
  return false;
}

/**
 * Fetch user data with automatic error handling
 */
export async function fetchUserData(router: any) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    router.push('/login');
    return null;
  }

  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Handle auth errors
    if (handleAuthError(response.status, router)) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to load user data');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Fetch user data error:', error);
    throw error;
  }
}

/**
 * Logout user (clear tokens and redirect)
 */
export function logout(router: any) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

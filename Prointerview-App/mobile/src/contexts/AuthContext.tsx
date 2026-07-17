import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: (backendHost?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Khôi phục phiên đăng nhập khi khởi chạy ứng dụng
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await authService.getStoredToken();
        const storedUser = await authService.getStoredUser();
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    restoreSession();
  }, []);

  const loginWithGoogle = async (backendHost?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.signInWithGoogle(backendHost);
      
      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        return true;
      } else {
        setError(response.error || 'Đăng nhập thất bại.');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi kết nối.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.clearAuthData();
      setToken(null);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        loginWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Business } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  activeBusiness: Business | null;
  businesses: Business[];
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, businessName: string) => Promise<void>;
  logout: () => void;
  switchBusiness: (business: Business) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = api.getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const u = await api.getMe();
        setUser(u);
        const bList = await api.getBusinesses();
        setBusinesses(bList);
        const storedBizId = api.getActiveBusinessId();
        const active = bList.find(b => b.id === storedBizId) || bList[0] || null;
        if (active) {
          setActiveBusiness(active);
          api.setActiveBusiness(active.id);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        api.setToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setUser(res.user);
      setBusinesses(res.businesses);
      setToken(res.access_token);
      const active = res.businesses.find(b => b.id === res.active_business_id) || res.businesses[0] || null;
      setActiveBusiness(active);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string, businessName: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(email, password, fullName, businessName);
      setUser(res.user);
      setBusinesses(res.businesses);
      setToken(res.access_token);
      const active = res.businesses.find(b => b.id === res.active_business_id) || res.businesses[0] || null;
      setActiveBusiness(active);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    api.setActiveBusiness(null);
    setToken(null);
    setUser(null);
    setBusinesses([]);
    setActiveBusiness(null);
  };

  const switchBusiness = (b: Business) => {
    setActiveBusiness(b);
    api.setActiveBusiness(b.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeBusiness,
      businesses,
      token,
      isLoading,
      login,
      register,
      logout,
      switchBusiness
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

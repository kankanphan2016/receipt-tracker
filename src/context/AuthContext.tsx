import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService } from "../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role?: string;
  isActive?: boolean;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const apiUser = await apiService.createUser({
        username: email, // Use email as username
        full_name: name,
        email,
        password,
      });
      const user: User = {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        createdAt: apiUser.createdAt,
      };

      await AsyncStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      return true;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Attempting login for:", email);
      const apiUser: any = await apiService.login({
        username: email,
        password,
      });
      console.log("Login successful:", apiUser);
      const user: User = {
        id: apiUser.user.user_id,
        name: apiUser.user.username,
        email: apiUser.user.email,
        createdAt: apiUser.user.createdAt,
        role: apiUser.user.role,
        lastLogin: apiUser.user.lastLogin,
        isActive: apiUser.user.isActive,
      };

      await AsyncStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out user");
      await AsyncStorage.removeItem("user");
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateProfile = async (name: string, email: string) => {
    try {
      if (!user) return;

      // Note: You may need to add an update user endpoint to your backend
      // For now, we'll update locally
      const updatedUser = { ...user, name, email };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log("Profile updated:", updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

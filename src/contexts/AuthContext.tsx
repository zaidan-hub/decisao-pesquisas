import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string, role: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('id', userId)
        .single() as any;

      if (error) throw error;
      
      if (data) {
        setUser({
          id: data.id as string,
          email: data.email as string,
          name: data.name as string,
          role: data.role as 'admin' | 'pesquisador'
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username: string, password: string, name: string, role: string) => {
    try {
      // Convert username to email format for Supabase Auth
      const email = `${username}@sistema.local`;
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
            email // Store the fake email
          }
        }
      });

      if (error) return { error: error.message };
      if (!data.user) return { error: 'Erro ao criar usuário' };

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro ao criar conta' };
    }
  };

  const login = async (username: string, password: string) => {
    try {
      // Convert username to email format for Supabase Auth
      const email = `${username}@sistema.local`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) return { error: 'Usuário ou senha inválidos' };
      return { error: null };
    } catch (error: any) {
      return { error: 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (undefined === context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
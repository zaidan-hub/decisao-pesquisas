import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for prototype
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@sistema.com',
    name: 'Administrador',
    role: 'admin'
  },
  {
    id: '2',
    email: 'maria.silva@sistema.com',
    name: 'Maria Silva',
    role: 'anotadora'
  },
  {
    id: '3',
    email: 'cliente@sistema.com',
    name: 'João Santos',
    role: 'cliente'
  }
];

// Mock pesquisadores para autenticação
const mockPesquisadores = [
  { id: '2', login: 'maria.silva', senha: '123456', nome: 'Maria Silva', email: 'maria.silva@sistema.com' },
  { id: '4', login: 'joao.santos', senha: '123456', nome: 'João Santos', email: 'joao.santos@sistema.com' },
  { id: '5', login: 'ana.costa', senha: '123456', nome: 'Ana Costa', email: 'ana.costa@sistema.com' }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, role: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Admin login com email
    if (role === 'admin') {
      const foundUser = mockUsers.find(u => u.email === email && u.role === role);
      if (foundUser && password === '123456') {
        setUser(foundUser);
        return true;
      }
    }
    
    // Pesquisador login com login ou email
    if (role === 'anotadora') {
      const foundPesquisador = mockPesquisadores.find(p => 
        (p.login === email || p.email === email) && p.senha === password
      );
      
      if (foundPesquisador) {
        const user: User = {
          id: foundPesquisador.id,
          email: foundPesquisador.email,
          name: foundPesquisador.nome,
          role: 'anotadora'
        };
        setUser(user);
        return true;
      }
    }
    
    // Cliente login com email
    if (role === 'cliente') {
      const foundUser = mockUsers.find(u => u.email === email && u.role === role);
      if (foundUser && password === '123456') {
        setUser(foundUser);
        return true;
      }
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
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
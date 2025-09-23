import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { SupermercadosPage } from '@/pages/admin/SupermercadosPage';
import { ProdutosPage } from '@/pages/admin/ProdutosPage';
import { PesquisasPage } from '@/pages/admin/PesquisasPage';
import { PesquisadoresPage } from '@/pages/admin/PesquisadoresPage';
import { RelatoriosPage } from '@/pages/admin/RelatoriosPage';
import { 
  Store, 
  Package, 
  Search, 
  Users, 
  BarChart3, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

type MenuOption = 'dashboard' | 'supermercados' | 'produtos' | 'pesquisas' | 'pesquisadores' | 'relatorios';

export const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState<MenuOption>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'supermercados', label: 'Supermercados', icon: Store },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'pesquisas', label: 'Pesquisas', icon: Search },
    { id: 'pesquisadores', label: 'Pesquisadores', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'supermercados':
        return <SupermercadosPage />;
      case 'produtos':
        return <ProdutosPage />;
      case 'pesquisas':
        return <PesquisasPage />;
      case 'pesquisadores':
        return <PesquisadoresPage />;
      case 'relatorios':
        return <RelatoriosPage />;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Bem-vindo, {user?.name}!</h2>
              <p className="text-muted-foreground mt-2">
                Sistema de Comparação de Preços - Painel Administrativo
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Card 
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setActiveMenu(item.id as MenuOption)}
                  >
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        Gerenciar {item.label.toLowerCase()} do sistema
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r transform transition-transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Sistema Preços</h1>
                  <p className="text-sm text-muted-foreground">Admin Panel</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Button
              variant={activeMenu === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setActiveMenu('dashboard');
                setSidebarOpen(false);
              }}
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Dashboard
            </Button>
            
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeMenu === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveMenu(item.id as MenuOption);
                    setSidebarOpen(false);
                  }}
                >
                  <IconComponent className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold capitalize">
                  {activeMenu === 'dashboard' ? 'Dashboard' : activeMenu}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
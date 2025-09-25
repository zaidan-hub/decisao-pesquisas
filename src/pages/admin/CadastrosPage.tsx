import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientesPage } from './ClientesPage';
import { SupermercadosPage } from './SupermercadosPage';
import { PesquisadoresPage } from './PesquisadoresPage';
import { ProdutosPage } from './ProdutosPage';
import { ListasPage } from './ListasPage';
import { 
  Users, 
  Store, 
  Package, 
  List,
  UserCheck
} from 'lucide-react';

type CadastroOption = 'overview' | 'clientes' | 'supermercados' | 'pesquisadores' | 'produtos' | 'listas';

export const CadastrosPage = () => {
  const [activeSection, setActiveSection] = useState<CadastroOption>('overview');

  const cadastroItems = [
    { id: 'clientes', label: 'Clientes', icon: Users, description: 'Gerenciar clientes do sistema' },
    { id: 'supermercados', label: 'Supermercados', icon: Store, description: 'Gerenciar supermercados cadastrados' },
    { id: 'pesquisadores', label: 'Pesquisadores', icon: UserCheck, description: 'Gerenciar pesquisadores ativos' },
    { id: 'produtos', label: 'Produtos', icon: Package, description: 'Gerenciar produtos, grupos e subgrupos' },
    { id: 'listas', label: 'Listas', icon: List, description: 'Gerenciar listas de produtos' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'clientes':
        return <ClientesPage />;
      case 'supermercados':
        return <SupermercadosPage />;
      case 'pesquisadores':
        return <PesquisadoresPage />;
      case 'produtos':
        return <ProdutosPage />;
      case 'listas':
        return <ListasPage />;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Cadastros</h2>
              <p className="text-muted-foreground mt-2">
                Gerencie todos os cadastros do sistema
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cadastroItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Card 
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setActiveSection(item.id as CadastroOption)}
                  >
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        {item.description}
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

  return renderContent();
};
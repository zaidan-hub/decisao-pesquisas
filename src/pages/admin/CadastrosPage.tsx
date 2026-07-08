import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientesPage } from './ClientesPage';
import { SupermercadosPage } from './SupermercadosPage';
import { SupermercadoDetailPage } from './SupermercadoDetailPage';
import { PesquisadoresPage } from './PesquisadoresPage';
import { ProdutosPage } from './ProdutosPage';
import { Supermercado } from '@/types';
import { 
  Users, 
  Store, 
  Package, 
  UserCheck,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

type CadastroOption = 'overview' | 'clientes' | 'supermercados' | 'pesquisadores' | 'produtos';

export const CadastrosPage = () => {
  const [activeSection, setActiveSection] = useState<CadastroOption>('overview');
  const [selectedSupermercado, setSelectedSupermercado] = useState<Supermercado | null>(null);

  const cadastroItems = [
    { id: 'clientes', label: 'Clientes', icon: Users, description: 'Gerenciar clientes do sistema' },
    { id: 'supermercados', label: 'Supermercados', icon: Store, description: 'Gerenciar supermercados cadastrados' },
    { id: 'pesquisadores', label: 'Pesquisadores', icon: UserCheck, description: 'Gerenciar pesquisadores ativos' },
    { id: 'produtos', label: 'Produtos', icon: Package, description: 'Gerenciar produtos, grupos e subgrupos' },
    { id: 'listas', label: 'Listas', icon: List, description: 'Gerenciar listas de produtos' },
  ];

  const renderContent = () => {
    const currentItem = cadastroItems.find(item => item.id === activeSection);

    // Supermercado detail view
    if (selectedSupermercado) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveSection('overview')}>Cadastros</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="cursor-pointer hover:text-foreground" onClick={() => { setSelectedSupermercado(null); setActiveSection('supermercados'); }}>Supermercados</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="font-medium text-foreground">{selectedSupermercado.nome}</span>
            </div>
          </div>
          <SupermercadoDetailPage
            supermercado={selectedSupermercado}
            onBack={() => { setSelectedSupermercado(null); setActiveSection('supermercados'); }}
          />
        </div>
      );
    }
    
    if (activeSection !== 'overview') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveSection('overview')} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Cadastros
              </Button>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveSection('overview')}>Cadastros</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="font-medium text-foreground">{currentItem?.label}</span>
            </div>
          </div>
          <div>
            {activeSection === 'clientes' && <ClientesPage />}
            {activeSection === 'supermercados' && (
              <SupermercadosPage onSelectSupermercado={(s) => setSelectedSupermercado(s)} />
            )}
            {activeSection === 'pesquisadores' && <PesquisadoresPage />}
            {activeSection === 'produtos' && <ProdutosPage />}
            {activeSection === 'listas' && <ListasPage />}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Cadastros</h2>
          <p className="text-muted-foreground mt-2">Gerencie todos os cadastros do sistema</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cadastroItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection(item.id as CadastroOption)}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                    <IconComponent className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return renderContent();
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ColetasTab } from './researcher/ColetasTab';
import { HistoricoTab } from './researcher/HistoricoTab';
import { LogOut, FileText, History } from 'lucide-react';

export const ResearcherDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Decisão Pesquisas</h1>
          <p className="text-sm text-muted-foreground">Pesquisador</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <Tabs defaultValue="coletas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="coletas" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Coletas
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="coletas" className="space-y-4">
            <ColetasTab />
          </TabsContent>
          
          <TabsContent value="historico" className="space-y-4">
            <HistoricoTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const RelatoriosPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo Relatório Padrão
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Relatório
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
          <CardDescription>Sistema de relatórios em desenvolvimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Funcionalidade em desenvolvimento</h3>
            <p className="text-muted-foreground">
              Os relatórios serão implementados em breve com todas as funcionalidades solicitadas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
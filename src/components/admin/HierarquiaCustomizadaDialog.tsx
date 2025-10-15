import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Departamento, Grupo, Subgrupo, Produto } from '@/types';

interface HierarquiaCustomizadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtosSelecionados: string[];
  produtos: Produto[];
  departamentos: Departamento[];
  grupos: Grupo[];
  subgrupos: Subgrupo[];
  hierarquiaAtual?: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  };
  onSave: (hierarquia: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  }) => void;
}

export const HierarquiaCustomizadaDialog = ({
  open,
  onOpenChange,
  produtosSelecionados,
  produtos,
  departamentos,
  grupos,
  subgrupos,
  hierarquiaAtual,
  onSave
}: HierarquiaCustomizadaDialogProps) => {
  const [customNames, setCustomNames] = useState<{
    departamentos: { [id: string]: string };
    grupos: { [id: string]: string };
    subgrupos: { [id: string]: string };
  }>({
    departamentos: hierarquiaAtual?.departamentos || {},
    grupos: hierarquiaAtual?.grupos || {},
    subgrupos: hierarquiaAtual?.subgrupos || {}
  });

  // Identificar quais departamentos, grupos e subgrupos estão sendo usados pelos produtos selecionados
  const itensUsados = useMemo(() => {
    const deps = new Set<string>();
    const grps = new Set<string>();
    const subs = new Set<string>();

    produtosSelecionados.forEach(prodId => {
      const produto = produtos.find(p => p.id === prodId);
      if (produto) {
        subs.add(produto.subgrupoId);
        grps.add(produto.grupoId);
        
        const grupo = grupos.find(g => g.id === produto.grupoId);
        if (grupo?.departamentoId) {
          deps.add(grupo.departamentoId);
        }
      }
    });

    return {
      departamentos: Array.from(deps),
      grupos: Array.from(grps),
      subgrupos: Array.from(subs)
    };
  }, [produtosSelecionados, produtos, grupos]);

  const handleSave = () => {
    // Remover entradas vazias
    const hierarquia = {
      departamentos: Object.fromEntries(
        Object.entries(customNames.departamentos).filter(([_, v]) => v.trim() !== '')
      ),
      grupos: Object.fromEntries(
        Object.entries(customNames.grupos).filter(([_, v]) => v.trim() !== '')
      ),
      subgrupos: Object.fromEntries(
        Object.entries(customNames.subgrupos).filter(([_, v]) => v.trim() !== '')
      )
    };
    
    onSave(hierarquia);
    onOpenChange(false);
  };

  const handleReset = () => {
    setCustomNames({
      departamentos: {},
      grupos: {},
      subgrupos: {}
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Personalizar Hierarquia</DialogTitle>
          <DialogDescription>
            Customize os nomes de departamentos, grupos e subgrupos que aparecem nesta lista.
            Deixe em branco para manter o nome original.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="departamentos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="departamentos">
              Departamentos ({itensUsados.departamentos.length})
            </TabsTrigger>
            <TabsTrigger value="grupos">
              Grupos ({itensUsados.grupos.length})
            </TabsTrigger>
            <TabsTrigger value="subgrupos">
              Subgrupos ({itensUsados.subgrupos.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="departamentos" className="space-y-4">
              {itensUsados.departamentos.map(depId => {
                const dep = departamentos.find(d => d.id === depId);
                if (!dep) return null;

                return (
                  <div key={depId} className="space-y-2 p-4 border rounded-md">
                    <Label htmlFor={`dep-${depId}`}>
                      {dep.codigo} - {dep.nome}
                    </Label>
                    <Input
                      id={`dep-${depId}`}
                      placeholder={`Nome customizado (original: ${dep.nome})`}
                      value={customNames.departamentos[depId] || ''}
                      onChange={(e) => setCustomNames(prev => ({
                        ...prev,
                        departamentos: {
                          ...prev.departamentos,
                          [depId]: e.target.value
                        }
                      }))}
                    />
                  </div>
                );
              })}
              {itensUsados.departamentos.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum departamento nesta lista
                </p>
              )}
            </TabsContent>

            <TabsContent value="grupos" className="space-y-4">
              {itensUsados.grupos.map(grupoId => {
                const grupo = grupos.find(g => g.id === grupoId);
                if (!grupo) return null;

                return (
                  <div key={grupoId} className="space-y-2 p-4 border rounded-md">
                    <Label htmlFor={`grupo-${grupoId}`}>
                      {grupo.codigo} - {grupo.nome}
                    </Label>
                    <Input
                      id={`grupo-${grupoId}`}
                      placeholder={`Nome customizado (original: ${grupo.nome})`}
                      value={customNames.grupos[grupoId] || ''}
                      onChange={(e) => setCustomNames(prev => ({
                        ...prev,
                        grupos: {
                          ...prev.grupos,
                          [grupoId]: e.target.value
                        }
                      }))}
                    />
                  </div>
                );
              })}
              {itensUsados.grupos.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum grupo nesta lista
                </p>
              )}
            </TabsContent>

            <TabsContent value="subgrupos" className="space-y-4">
              {itensUsados.subgrupos.map(subId => {
                const sub = subgrupos.find(s => s.id === subId);
                if (!sub) return null;

                return (
                  <div key={subId} className="space-y-2 p-4 border rounded-md">
                    <Label htmlFor={`sub-${subId}`}>
                      {sub.codigo} - {sub.nome}
                    </Label>
                    <Input
                      id={`sub-${subId}`}
                      placeholder={`Nome customizado (original: ${sub.nome})`}
                      value={customNames.subgrupos[subId] || ''}
                      onChange={(e) => setCustomNames(prev => ({
                        ...prev,
                        subgrupos: {
                          ...prev.subgrupos,
                          [subId]: e.target.value
                        }
                      }))}
                    />
                  </div>
                );
              })}
              {itensUsados.subgrupos.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum subgrupo nesta lista
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={handleReset}>
            Limpar Personalizações
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Personalizações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pesquisador } from '@/types';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, UserCheck, UserX, Key, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

// Schema de validação com zod
const pesquisadorSchema = z.object({
  codigo: z.string().trim().max(10, { message: "Código deve ter no máximo 10 caracteres" }),
  nome: z.string().trim().nonempty({ message: "Nome é obrigatório" }).max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  email: z.string().trim().email({ message: "Email inválido" }).max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  telefone: z.string().trim().max(20, { message: "Telefone deve ter no máximo 20 caracteres" }),
  login: z.string().trim().nonempty({ message: "Login é obrigatório" }).min(3, { message: "Login deve ter pelo menos 3 caracteres" }).max(50, { message: "Login deve ter no máximo 50 caracteres" }).regex(/^[a-zA-Z0-9._]+$/, { message: "Login deve conter apenas letras, números, pontos e underscores" }),
  senha: z.string().nonempty({ message: "Senha é obrigatória" }).min(6, { message: "Senha deve ter pelo menos 6 caracteres" }).max(100, { message: "Senha deve ter no máximo 100 caracteres" }),
  ativo: z.boolean()
});

export const PesquisadoresPage = () => {
  const [pesquisadores, setPesquisadores] = useState<Pesquisador[]>([
    {
      id: '1',
      codigo: 'PES001',
      nome: 'Maria Silva',
      email: 'maria.silva@sistema.com',
      telefone: '(11) 99999-1111',
      ativo: true,
      login: 'maria.silva',
      senha: '123456'
    },
    {
      id: '2',
      codigo: 'PES002',
      nome: 'João Santos',
      email: 'joao.santos@sistema.com',
      telefone: '(11) 99999-2222',
      ativo: true,
      login: 'joao.santos',
      senha: '123456'
    },
    {
      id: '3',
      codigo: 'PES003',
      nome: 'Ana Costa',
      email: 'ana.costa@sistema.com',
      telefone: '(11) 99999-3333',
      ativo: false,
      login: 'ana.costa',
      senha: '123456'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingPesquisador, setEditingPesquisador] = useState<Pesquisador | null>(null);
  const [deletePesquisador, setDeletePesquisador] = useState<Pesquisador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    email: '',
    telefone: '',
    login: '',
    senha: '',
    ativo: true
  });

  const generateCode = () => {
    const nextNum = pesquisadores.length + 1;
    return `PES${nextNum.toString().padStart(3, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      codigo: generateCode(),
      nome: '',
      email: '',
      telefone: '',
      login: '',
      senha: '',
      ativo: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar dados com zod
      pesquisadorSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Erro de validação",
          description: firstError.message,
          variant: "destructive"
        });
        return;
      }
    }

    // Validar email único
    const emailExists = pesquisadores.some(p => 
      p.email.toLowerCase() === formData.email.toLowerCase() && 
      p.id !== editingPesquisador?.id
    );

    if (emailExists) {
      toast({
        title: "Email já existe",
        description: "Este email já está cadastrado para outro pesquisador.",
        variant: "destructive"
      });
      return;
    }

    // Validar login único
    const loginExists = pesquisadores.some(p => 
      p.login.toLowerCase() === formData.login.toLowerCase() && 
      p.id !== editingPesquisador?.id
    );

    if (loginExists) {
      toast({
        title: "Login já existe",
        description: "Este login já está cadastrado para outro pesquisador.",
        variant: "destructive"
      });
      return;
    }

    const pesquisador: Pesquisador = {
      id: editingPesquisador?.id || Date.now().toString(),
      codigo: formData.codigo || generateCode(),
      nome: formData.nome,
      email: formData.email,
      telefone: formData.telefone,
      login: formData.login,
      senha: formData.senha,
      ativo: formData.ativo
    };

    if (editingPesquisador) {
      setPesquisadores(prev => prev.map(p => p.id === editingPesquisador.id ? pesquisador : p));
      toast({
        title: "Sucesso",
        description: "Pesquisador atualizado com sucesso!"
      });
    } else {
      setPesquisadores(prev => [...prev, pesquisador]);
      toast({
        title: "Sucesso",
        description: "Pesquisador cadastrado com sucesso!"
      });
    }

    setShowForm(false);
    setEditingPesquisador(null);
    resetForm();
  };

  const handleEdit = (pesquisador: Pesquisador) => {
    setEditingPesquisador(pesquisador);
    setFormData({
      codigo: pesquisador.codigo,
      nome: pesquisador.nome,
      email: pesquisador.email,
      telefone: pesquisador.telefone,
      login: pesquisador.login,
      senha: pesquisador.senha,
      ativo: pesquisador.ativo
    });
    setShowForm(true);
  };

  const handleDelete = (pesquisador: Pesquisador) => {
    setPesquisadores(prev => prev.filter(p => p.id !== pesquisador.id));
    setDeletePesquisador(null);
    toast({
      title: "Pesquisador excluído",
      description: "O pesquisador foi removido do sistema."
    });
  };

  const toggleStatus = (pesquisador: Pesquisador) => {
    setPesquisadores(prev => prev.map(p => 
      p.id === pesquisador.id ? { ...p, ativo: !p.ativo } : p
    ));
    toast({
      title: "Status alterado",
      description: `Pesquisador ${pesquisador.ativo ? 'desativado' : 'ativado'} com sucesso.`
    });
  };

  const filteredPesquisadores = pesquisadores
    .filter(p => 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.login.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Separar pesquisadores ativos e inativos
  const pesquisadoresAtivos = filteredPesquisadores.filter(p => p.ativo);
  const pesquisadoresInativos = filteredPesquisadores.filter(p => !p.ativo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Pesquisadores</h2>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Pesquisador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPesquisador ? 'Editar' : 'Novo'} Pesquisador
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do pesquisador
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  placeholder="PES001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo do pesquisador"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login">Login *</Label>
                <Input
                  id="login"
                  value={formData.login}
                  onChange={(e) => setFormData(prev => ({ ...prev, login: e.target.value }))}
                  placeholder="usuario.nome"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Apenas letras, números, pontos e underscores
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <Input
                  id="senha"
                  type="text"
                  value={formData.senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                  placeholder="Digite a senha"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Pesquisador ativo</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingPesquisador(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPesquisador ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pesquisadores por nome, email, código ou login..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pesquisadores Ativos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pesquisadores Ativos</h3>
          <span className="text-sm text-muted-foreground">
            {pesquisadoresAtivos.length} pesquisador(es)
          </span>
        </div>
        
        <div className="grid gap-4">
          {pesquisadoresAtivos.map((pesquisador) => (
            <Card key={pesquisador.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{pesquisador.nome}</h3>
                      <span className="px-2 py-1 rounded-full text-xs flex items-center gap-1 bg-success/10 text-success">
                        <UserCheck className="w-3 h-3" />
                        Ativo
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span><strong>Código:</strong> {pesquisador.codigo}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{pesquisador.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Key className="w-4 h-4" />
                        <span><strong>Login:</strong> {pesquisador.login}</span>
                      </div>
                      
                      {pesquisador.telefone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{pesquisador.telefone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(pesquisador)}
                      className="text-warning"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(pesquisador)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletePesquisador(pesquisador)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {pesquisadoresAtivos.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum pesquisador ativo encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Cadastre o primeiro pesquisador'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pesquisadores Inativos - Seção Retrátil */}
      {pesquisadoresInativos.length > 0 && (
        <Collapsible open={showInactive} onOpenChange={setShowInactive}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Pesquisadores Inativos</span>
                <span className="text-sm text-muted-foreground">
                  ({pesquisadoresInativos.length})
                </span>
              </div>
              {showInactive ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid gap-4">
              {pesquisadoresInativos.map((pesquisador) => (
                <Card key={pesquisador.id} className="hover:shadow-md transition-shadow opacity-75">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{pesquisador.nome}</h3>
                          <span className="px-2 py-1 rounded-full text-xs flex items-center gap-1 bg-muted text-muted-foreground">
                            <UserX className="w-3 h-3" />
                            Inativo
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span><strong>Código:</strong> {pesquisador.codigo}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span>{pesquisador.email}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Key className="w-4 h-4" />
                            <span><strong>Login:</strong> {pesquisador.login}</span>
                          </div>
                          
                          {pesquisador.telefone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              <span>{pesquisador.telefone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(pesquisador)}
                          className="text-success"
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(pesquisador)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletePesquisador(pesquisador)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePesquisador} onOpenChange={() => setDeletePesquisador(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pesquisador "{deletePesquisador?.nome}"? 
              <br /><strong>Essa ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletePesquisador && handleDelete(deletePesquisador)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
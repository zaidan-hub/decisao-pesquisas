import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AdminSetup() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAndCreateAdmin();
  }, []);

  const checkAndCreateAdmin = async () => {
    try {
      setCreating(true);
      
      // Call the edge function to create admin user
      const { data, error } = await supabase.functions.invoke('create-admin-user');

      if (error) {
        console.error('Error creating admin:', error);
        toast({
          title: "Erro",
          description: "Erro ao configurar usuário admin. Tente novamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: data.message || "Usuário admin configurado!",
        });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao configurar sistema.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Configuração Inicial</CardTitle>
          <CardDescription>
            Configurando o sistema...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          {(loading || creating) ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Criando usuário administrador...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Configuração concluída! Você será redirecionado para a página de login.
              </p>
              <Button onClick={() => navigate('/auth')}>
                Ir para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

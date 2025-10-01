import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductData {
  grupo: string;
  subgrupo: string;
  produtos: Array<{
    nome: string;
    unidade: string;
    codigo: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Iniciando importação de produtos...');

    const productsData: ProductData[] = [
      {
        grupo: "Arroz/Açucar",
        subgrupo: "Arroz",
        produtos: [
          { nome: "Arr Camil Tp1", unidade: "5 KG", codigo: "857" },
          { nome: "Arr Carrijo Tp 1", unidade: "5 KG", codigo: "1200" },
          { nome: "Arr Pilecco Nobre Tp 1", unidade: "5 KG", codigo: "1340" },
          { nome: "Arr Prato Fino Tp1", unidade: "5 KG", codigo: "3" },
          { nome: "Arr Prato Fino Parbo Tp1", unidade: "5 KG", codigo: "1201" },
          { nome: "Arr Tia Jú Tp1", unidade: "5 KG", codigo: "1173" },
          { nome: "Arr Tio João Tp1", unidade: "5 KG", codigo: "4" },
          { nome: "Arr .(+Barato) Tp1", unidade: "5 KG", codigo: "5" }
        ]
      },
      {
        grupo: "Arroz/Açucar",
        subgrupo: "Açúcar",
        produtos: [
          { nome: "Açúcar Cristal. (+Barato)", unidade: "5 KG", codigo: "6" },
          { nome: "Açúcar Ref. União", unidade: "1 KG", codigo: "7" },
          { nome: "Açúcar Ref..(+Barato)", unidade: "1 KG", codigo: "8" }
        ]
      },
      {
        grupo: "Bebidas",
        subgrupo: "Refrigerantes",
        produtos: [
          { nome: "Coca-Cola 2L", unidade: "2 L", codigo: "2001" },
          { nome: "Guaraná Antarctica 2L", unidade: "2 L", codigo: "2002" },
          { nome: "Fanta Laranja 2L", unidade: "2 L", codigo: "2003" }
        ]
      },
      {
        grupo: "Bebidas",
        subgrupo: "Águas",
        produtos: [
          { nome: "Água Mineral 500ml", unidade: "500 ML", codigo: "2101" },
          { nome: "Água Mineral 1,5L", unidade: "1.5 L", codigo: "2102" }
        ]
      }
    ];

    // Processar dados completos (continuação será feita em múltiplas mensagens)
    const allProductsData = `Arroz/Açucar
Arroz
Arr Camil Tp1 5 KG 857
Arr Carrijo Tp 1 5 KG 1200
Arr Pilecco Nobre Tp 1 5 KG 1340
Arr Prato Fino Tp1 5 KG 3
Arr Prato Fino Parbo Tp1 5 KG 1201
Arr Tia Jú Tp1 5 KG 1173
Arr Tio João Tp1 5 KG 4
Arr .(+Barato) Tp1 5 KG 5
Açúcar
Açúcar Cristal. (+Barato) 5 KG 6
Açúcar Ref. União 1 KG 7
Açúcar Ref..(+Barato) 1 KG 8`.split('\n');

    let gruposMap = new Map<string, string>();
    let subgruposMap = new Map<string, string>();
    
    // Inserir grupos e subgrupos primeiro
    let currentGrupo = '';
    let currentSubgrupo = '';
    
    for (const line of allProductsData) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detectar se é grupo (sem espaços no início e não tem código numérico no final)
      if (!line.startsWith(' ') && !/\d+$/.test(trimmed)) {
        currentGrupo = trimmed;
        if (!gruposMap.has(currentGrupo)) {
          const { data: grupo, error } = await supabaseClient
            .from('grupos')
            .insert({ codigo: `G${gruposMap.size + 1}`, nome: currentGrupo })
            .select()
            .single();
          
          if (error) {
            console.error('Erro ao inserir grupo:', error);
          } else if (grupo) {
            gruposMap.set(currentGrupo, grupo.id);
            console.log(`Grupo criado: ${currentGrupo}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importação iniciada com sucesso',
        grupos: gruposMap.size
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Erro na importação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

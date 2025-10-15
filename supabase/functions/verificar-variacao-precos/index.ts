import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertaVariacao {
  produto_id: string;
  preco_anterior: number;
  preco_atual: number;
  variacao_percentual: number;
  coleta_anterior_id: string;
  data_anterior: string;
  visualizado: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { coleta_id } = await req.json();
    
    console.log('🔍 Verificando variação de preços para coleta:', coleta_id);

    if (!coleta_id) {
      throw new Error('coleta_id é obrigatório');
    }

    // Buscar a coleta atual
    const { data: coletaAtual, error: coletaError } = await supabase
      .from('coletas')
      .select('*')
      .eq('id', coleta_id)
      .single();

    if (coletaError) throw coletaError;
    if (!coletaAtual) throw new Error('Coleta não encontrada');

    console.log('📦 Coleta atual:', coletaAtual);

    // Buscar a última coleta finalizada do mesmo supermercado (excluindo a atual)
    const { data: coletaAnterior, error: anteriorError } = await supabase
      .from('coletas')
      .select('*')
      .eq('supermercado_id', coletaAtual.supermercado_id)
      .eq('status', 'finalizada')
      .neq('id', coleta_id)
      .order('data', { ascending: false })
      .limit(1)
      .single();

    if (anteriorError || !coletaAnterior) {
      console.log('ℹ️ Nenhuma coleta anterior encontrada para comparação');
      return new Response(
        JSON.stringify({ 
          success: true, 
          alertas: [],
          mensagem: 'Nenhuma coleta anterior para comparação' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Coleta anterior encontrada:', coletaAnterior.id);

    const precosAtuais = coletaAtual.precos_editados_admin || coletaAtual.precos || {};
    const precosAnteriores = coletaAnterior.precos_editados_admin || coletaAnterior.precos || {};

    const alertas: AlertaVariacao[] = [];

    // Comparar preços de produtos comuns
    Object.keys(precosAtuais).forEach((produtoId) => {
      const precoAtual = precosAtuais[produtoId];
      const precoAnterior = precosAnteriores[produtoId];

      // Ambos devem existir e ser maiores que 0
      if (precoAtual > 0 && precoAnterior > 0) {
        const variacaoPercentual = ((precoAtual - precoAnterior) / precoAnterior) * 100;
        
        // Se variação >= 70% (para mais ou para menos)
        if (Math.abs(variacaoPercentual) >= 70) {
          console.log(`⚠️ Variação significativa detectada para produto ${produtoId}: ${variacaoPercentual.toFixed(2)}%`);
          
          alertas.push({
            produto_id: produtoId,
            preco_anterior: precoAnterior,
            preco_atual: precoAtual,
            variacao_percentual: variacaoPercentual,
            coleta_anterior_id: coletaAnterior.id,
            data_anterior: coletaAnterior.data,
            visualizado: false
          });
        }
      }
    });

    // Atualizar a coleta com os alertas
    if (alertas.length > 0) {
      const { error: updateError } = await supabase
        .from('coletas')
        .update({ alertas_variacao: alertas })
        .eq('id', coleta_id);

      if (updateError) {
        console.error('❌ Erro ao atualizar alertas:', updateError);
        throw updateError;
      }

      console.log(`✅ ${alertas.length} alerta(s) de variação criado(s)`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertas,
        total_alertas: alertas.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

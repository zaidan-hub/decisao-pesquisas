// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    // Validate user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();

    // Basic validation
    const required = [
      "data",
      "supermercado_id",
      "pesquisador_id",
      "numero",
      "ano",
      "status",
      "produtos",
    ];

    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return new Response(JSON.stringify({ error: `Campo obrigatório ausente: ${key}` }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const insertPayload = {
      data: body.data,
      supermercado_id: body.supermercado_id,
      pesquisador_id: body.pesquisador_id,
      numero: body.numero,
      ano: body.ano,
      status: body.status,
      produtos: body.produtos ?? [],
      precos: body.precos ?? {},
      precos_editados_admin: body.precos_editados_admin ?? {},
      observacoes_produtos: body.observacoes_produtos ?? {},
      observacoes_finais: body.observacoes_finais ?? [],
      admin_visualizou_observacoes: body.admin_visualizou_observacoes ?? false,
      fotos: body.fotos ?? {},
      textos_mais_barato: body.textos_mais_barato ?? {},
    };

    const { data, error } = await supabaseAdmin
      .from("coletas")
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
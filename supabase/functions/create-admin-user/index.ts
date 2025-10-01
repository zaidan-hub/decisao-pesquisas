import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if admin user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUser?.users.some(u => u.email === 'leandro@sistema.local')

    if (adminExists) {
      return new Response(
        JSON.stringify({ message: 'Admin user already exists' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Create the admin user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'leandro@sistema.local',
      password: 'decisao123',
      email_confirm: true,
      user_metadata: {
        name: 'Leandro',
        role: 'admin'
      }
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ message: 'Admin user created successfully', user: data.user }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

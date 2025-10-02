-- 1. Criar trigger para auto-criar perfis quando usuários fazem signup
-- (a função handle_new_user já existe, só falta o trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill: criar perfis para usuários existentes que não têm perfil
INSERT INTO public.profiles (id, email, name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'admin')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
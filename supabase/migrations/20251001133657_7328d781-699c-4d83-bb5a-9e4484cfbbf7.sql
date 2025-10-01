-- Ensure trigger exists to populate profiles on new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Ensure profile exists for admin user
INSERT INTO public.profiles (id, email, name, role)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'name', u.email), COALESCE(u.raw_user_meta_data->>'role', 'pesquisador')
FROM auth.users u
WHERE u.email = 'leandro@sistema.local'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
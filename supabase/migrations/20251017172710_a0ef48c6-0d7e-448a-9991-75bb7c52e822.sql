-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = 'admin'
  )
$$;

-- Drop existing policy that allows all authenticated users to view pesquisadores
DROP POLICY IF EXISTS "Usuários autenticados podem ver pesquisadores" ON public.pesquisadores;

-- Create new policy: admins can see all, pesquisadores can only see themselves
CREATE POLICY "Admins podem ver todos, pesquisadores veem apenas a si mesmos"
ON public.pesquisadores
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);
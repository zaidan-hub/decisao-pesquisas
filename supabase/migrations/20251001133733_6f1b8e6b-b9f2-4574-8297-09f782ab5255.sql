-- Remove o usuário existente completamente
DELETE FROM public.profiles WHERE email = 'leandro@sistema.local';
DELETE FROM auth.users WHERE email = 'leandro@sistema.local';
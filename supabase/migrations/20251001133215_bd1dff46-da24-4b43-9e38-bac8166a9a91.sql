-- Delete any existing leandro user and recreate it properly
DO $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Find existing user
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'leandro@sistema.local';

  -- Delete from profiles first (if exists)
  IF existing_user_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = existing_user_id;
  END IF;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE email = 'leandro@sistema.local';

  -- Now create the admin user fresh
  -- Note: The trigger handle_new_user will automatically create the profile
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'leandro@sistema.local',
    crypt('decisao123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Leandro","role":"admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    false
  );

  RAISE NOTICE 'Admin user recreated successfully';
END $$;
-- Create admin user with username "leandro" and password "decisao123"
-- The profile will be created automatically by the handle_new_user trigger

DO $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'leandro@sistema.local';

  IF existing_user_id IS NULL THEN
    -- Insert into auth.users (the trigger will create the profile automatically)
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
      email_change_token_new
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
      ''
    );
    
    RAISE NOTICE 'Admin user created successfully';
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END $$;
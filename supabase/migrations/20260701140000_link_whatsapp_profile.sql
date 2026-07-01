-- Lie un compte web au profil créé via WhatsApp (même numéro, 8 derniers chiffres).

CREATE OR REPLACE FUNCTION public.link_whatsapp_profile()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_user_id uuid := auth.uid();
  v_phone   text;
  v_digits  text;
  v_tail    text;
  v_wa_id   uuid;
  v_moved   integer := 0;
  r         record;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT phone INTO v_phone FROM public.profiles WHERE id = p_user_id;
  IF v_phone IS NULL OR length(regexp_replace(v_phone, '\D', '', 'g')) < 8 THEN
    RETURN 0;
  END IF;

  v_digits := regexp_replace(v_phone, '\D', '', 'g');
  IF v_digits ~ '^2290' AND length(v_digits) >= 12 THEN
    v_digits := '229' || substring(v_digits from 5);
  END IF;
  v_tail := right(v_digits, 8);

  SELECT p.id INTO v_wa_id
  FROM public.profiles p
  WHERE p.id <> p_user_id
    AND p.email LIKE 'wa+%@whatsapp.tontine.local'
    AND right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 8) = v_tail
  ORDER BY p.created_at
  LIMIT 1;

  IF v_wa_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT * FROM public.group_members WHERE profile_id = v_wa_id
  LOOP
    INSERT INTO public.group_members (
      group_id, profile_id, role, turn_order, status,
      guarantee_type, guarantee_proof, guarantee_status, paid_date
    )
    VALUES (
      r.group_id, p_user_id, r.role, r.turn_order, r.status,
      r.guarantee_type, r.guarantee_proof, r.guarantee_status, r.paid_date
    )
    ON CONFLICT (group_id, profile_id) DO UPDATE SET
      role = CASE
        WHEN public.group_members.role = 'admin' OR EXCLUDED.role = 'admin' THEN 'admin'
        ELSE EXCLUDED.role
      END,
      turn_order = LEAST(public.group_members.turn_order, EXCLUDED.turn_order);

    v_moved := v_moved + 1;
  END LOOP;

  DELETE FROM public.group_members WHERE profile_id = v_wa_id;

  UPDATE public.groups SET created_by = p_user_id WHERE created_by = v_wa_id;

  UPDATE public.profiles
  SET phone = v_phone
  WHERE id = p_user_id AND (phone IS NULL OR phone = '');

  RETURN v_moved;
END;
$$;

REVOKE ALL ON FUNCTION public.link_whatsapp_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_whatsapp_profile() TO authenticated;

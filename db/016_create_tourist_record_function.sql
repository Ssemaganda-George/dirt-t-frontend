-- Create function for atomic tourist record creation
CREATE OR REPLACE FUNCTION create_tourist_record(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_home_city text DEFAULT NULL,
  p_home_country text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_tourist record;
BEGIN
  -- Lock tourists table to prevent concurrent tourist creation
  LOCK TABLE public.tourists IN SHARE ROW EXCLUSIVE MODE;

  -- Check if tourist record already exists
  SELECT * INTO v_tourist
  FROM public.tourists
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Update existing tourist record
    UPDATE public.tourists
    SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      tourist_home_city = COALESCE(p_home_city, tourist_home_city),
      tourist_home_country = COALESCE(p_home_country, tourist_home_country),
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'user_id', p_user_id);
  ELSE
    -- Create new tourist record
    INSERT INTO public.tourists (
      user_id,
      first_name,
      last_name,
      tourist_home_city,
      tourist_home_country,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_first_name,
      p_last_name,
      p_home_city,
      p_home_country,
      now(),
      now()
    );

    RETURN jsonb_build_object('success', true, 'action', 'created', 'user_id', p_user_id);
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
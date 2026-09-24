-- Signup may create a profile before email confirmation (auth.uid() can be
-- NULL), so bind initial profile data to the newly created auth.users row.
-- All subsequent role/status changes require an existing admin or service role.
CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_service boolean := coalesce(auth.jwt()->>'role','')='service_role';
  v_admin boolean := false;
BEGIN
  IF v_service THEN RETURN NEW; END IF;
  IF v_uid IS NOT NULL THEN v_admin := public.is_admin_user(); END IF;
  IF v_admin THEN RETURN NEW; END IF;
  IF coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
    RAISE EXCEPTION 'Anonymous checkout sessions cannot create or edit profiles';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.role NOT IN ('tourist','vendor') OR
       NEW.status IS DISTINCT FROM (CASE WHEN NEW.role='vendor' THEN 'pending' ELSE 'active' END) THEN
      RAISE EXCEPTION 'Self-registration cannot assign privileged role or status';
    END IF;
    IF v_uid IS NOT NULL AND v_uid IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'Profile identity does not match session';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id=NEW.id AND u.is_anonymous=false
        AND lower(u.email)=lower(NEW.email)
        AND (v_uid IS NOT NULL OR u.created_at > now()-interval '1 hour')
    ) THEN
      RAISE EXCEPTION 'Verified signup identity required';
    END IF;
  ELSE
    IF v_uid IS NULL OR OLD.id IS DISTINCT FROM v_uid OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile identity does not match session';
    END IF;
    IF (NEW.role,NEW.status,NEW.email) IS DISTINCT FROM (OLD.role,OLD.status,OLD.email) THEN
      RAISE EXCEPTION 'Role, status, and email are administrator managed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_identity ON public.profiles;
CREATE TRIGGER protect_profile_identity BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

CREATE OR REPLACE FUNCTION public.protect_vendor_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF coalesce(auth.jwt()->>'role','')='service_role' THEN RETURN NEW; END IF;
  IF v_uid IS NOT NULL AND public.is_admin_user() THEN RETURN NEW; END IF;
  IF coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
    RAISE EXCEPTION 'Anonymous checkout sessions cannot create or edit vendors';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' OR
       (v_uid IS NOT NULL AND NEW.user_id IS DISTINCT FROM v_uid) OR
       NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id
         WHERE p.id=NEW.user_id AND p.role='vendor' AND p.status='pending'
           AND u.is_anonymous=false
           AND (v_uid IS NOT NULL OR u.created_at > now()-interval '1 hour')) THEN
      RAISE EXCEPTION 'Vendor signup must belong to a pending vendor profile';
    END IF;
  ELSE
    IF v_uid IS NULL OR OLD.user_id IS DISTINCT FROM v_uid OR
       NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.status IS DISTINCT FROM OLD.status OR
       (NEW.approved_at,NEW.approved_by) IS DISTINCT FROM (OLD.approved_at,OLD.approved_by) THEN
      RAISE EXCEPTION 'Vendor identity and approval are administrator managed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_vendor_identity ON public.vendors;
CREATE TRIGGER protect_vendor_identity BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_identity();

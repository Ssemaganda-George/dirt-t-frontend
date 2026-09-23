-- get_effective_pricing currently references public tables without schema
-- qualification. Its caller must include public in the function search path.
ALTER FUNCTION public.prepare_checkout_order(uuid,text,text,text) SET search_path = public;

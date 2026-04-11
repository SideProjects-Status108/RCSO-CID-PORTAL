-- RCSO CID Portal — profiles + RLS (Phase 0)
-- Apply in Supabase SQL editor or via supabase db push.

-- ---------------------------------------------------------------------------
-- ONE-TIME BOOTSTRAP (run in Supabase SQL editor after the first auth user exists)
-- Replace <auth.users uuid> with the user's id from Authentication → Users.
--
--   INSERT INTO public.profiles (id, role, full_name)
--   VALUES ('<auth.users uuid>', 'admin', 'Administrator');
--
-- Then disable public sign-ups in Authentication → Providers → Email, and set
-- ALLOW_BOOTSTRAP_SIGNUP=false in the app environment.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN (
      'admin',
      'supervision_admin',
      'supervision',
      'fto_coordinator',
      'fto',
      'detective',
      'dit'
    )
  ),
  full_name text NOT NULL DEFAULT '',
  badge_number text,
  phone_cell text,
  phone_office text,
  unit text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles (is_active);

-- RLS-safe role checks (SECURITY DEFINER avoids recursive policy evaluation on profiles).
CREATE OR REPLACE FUNCTION public.profile_is_admin_scope()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervision_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.profile_is_admin_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_admin_scope() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

-- Non-admins cannot change their own role or is_active (RLS cannot express column-level checks reliably).
CREATE OR REPLACE FUNCTION public.profiles_block_privileged_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;
  SELECT p.role INTO actor_role FROM public.profiles p WHERE p.id = auth.uid();
  IF actor_role = 'admin' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Cannot change role or is_active on your own profile';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privileged_self_update_trg ON public.profiles;
CREATE TRIGGER profiles_block_privileged_self_update_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.profiles_block_privileged_self_update();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: own row
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- SELECT: admin + supervision_admin see all
CREATE POLICY "profiles_select_admin_scope"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.profile_is_admin_scope());

-- UPDATE: admin may update any profile
CREATE POLICY "profiles_update_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.profile_is_admin())
WITH CHECK (public.profile_is_admin());

-- UPDATE: users may update their own row (trigger blocks role / is_active changes unless admin)
CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- INSERT: only admins (bootstrap first row via SQL as superuser)
CREATE POLICY "profiles_insert_admin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin());

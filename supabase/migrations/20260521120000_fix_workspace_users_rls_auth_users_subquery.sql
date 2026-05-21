/*
  Fix "permission denied for table users" on workspace_users SELECT.

  The policy "Users can view their workspace memberships" from
  20250101000000_support_auth0_users.sql includes:

    user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())

  RLS expressions run with the querying role's privileges. The authenticated
  role cannot SELECT from auth.users, so evaluating that clause errors.

  Later migrations intended to replace workspace_users policies, but DROP POLICY
  used different names, so this policy could remain and break any query on
  workspace_users (including .eq('user_id', ...)).

  We drop the broken policy and ensure a permissive read policy exists
  (aligned with 20250718164425_shiny_summit.sql).
*/

DROP POLICY IF EXISTS "Users can view their workspace memberships" ON public.workspace_users;

DROP POLICY IF EXISTS "Allow users to view workspace memberships" ON public.workspace_users;

CREATE POLICY "Allow users to view workspace memberships"
  ON public.workspace_users
  FOR SELECT
  TO authenticated
  USING (true);

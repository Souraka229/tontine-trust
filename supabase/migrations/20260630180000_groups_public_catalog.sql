-- Catalogue public : groupes ouverts visibles sans compte (rejoindre / rechercher)

DROP POLICY IF EXISTS "groups_select_open_catalog" ON public.groups;
CREATE POLICY "groups_select_open_catalog"
  ON public.groups FOR SELECT
  USING (
    status = 'pending'
    AND members_count < max_members
  );

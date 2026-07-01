-- Groupes ouverts visibles sans compte (catalogue soutenance)

INSERT INTO public.groups (
  name, initials, color, contribution_amount, frequency, order_type,
  status, max_members, members_count, total_rounds, min_score, penalty_rate
)
SELECT * FROM (VALUES
  ('Tontine Akpakpa', 'TA', 'green', 25000::numeric, 'Mensuelle'::public.group_frequency, 'random'::public.group_order_type, 'pending'::public.group_status, 10, 4, 10, 400, 5::numeric),
  ('Diaspora Cotonou', 'DC', 'blue', 50000::numeric, 'Mensuelle'::public.group_frequency, 'vrf'::public.group_order_type, 'pending'::public.group_status, 8, 5, 8, 500, 5::numeric),
  ('Solidarité Porto-Novo', 'SP', 'amber', 15000::numeric, 'Hebdomadaire'::public.group_frequency, 'manual'::public.group_order_type, 'pending'::public.group_status, 12, 3, 12, 350, 3::numeric),
  ('Trésor BTC Pilote', 'TB', 'purple', 100000::numeric, 'Mensuelle'::public.group_frequency, 'vrf'::public.group_order_type, 'pending'::public.group_status, 6, 2, 6, 600, 5::numeric)
) AS v(name, initials, color, contribution_amount, frequency, order_type, status, max_members, members_count, total_rounds, min_score, penalty_rate)
WHERE NOT EXISTS (
  SELECT 1 FROM public.groups g WHERE g.name = v.name
);

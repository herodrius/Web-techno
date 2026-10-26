-- Projet « Ta petite entreprise » : UNE table, SIX colonnes, un booléen.
-- Exécuter dans le SQL Editor de TON projet Supabase.
create table if not exists public.bieres (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 100),
  prix numeric(6,2) not null check (prix >= 0),
  categorie text not null check (categorie in ('Original', 'Gold', 'Red')),
  image_url text not null,
  disponible boolean not null default true
);

-- Seul Express, avec la clé secret / service_role, accède aux données.
alter table public.bieres enable row level security;
revoke all on table public.bieres from anon, authenticated;
grant select, insert, update, delete on table public.bieres to service_role;

-- Données de départ pour la démonstration du cours.
-- Identifiants fixes : relancer le script n'écrase pas tes changements.
insert into public.bieres (id, nom, prix, categorie, image_url, disponible) values
('86000000-0000-4000-8000-000000000001', 'Original · 50 cl', 2.40, 'Original', '/products/original.webp', true),
('86000000-0000-4000-8000-000000000002', 'Original · duo 50 cl', 4.60, 'Original', '/products/original.webp', true),
('86000000-0000-4000-8000-000000000003', 'Original · coffret 4 canettes', 8.90, 'Original', '/products/original.webp', true),
('86000000-0000-4000-8000-000000000004', 'Original · coffret 6 canettes', 12.90, 'Original', '/products/original.webp', false),
('86000000-0000-4000-8000-000000000005', 'Gold · 50 cl', 2.60, 'Gold', '/products/gold.webp', true),
('86000000-0000-4000-8000-000000000006', 'Gold · duo 50 cl', 4.90, 'Gold', '/products/gold.webp', true),
('86000000-0000-4000-8000-000000000007', 'Gold · coffret 4 canettes', 9.50, 'Gold', '/products/gold.webp', false),
('86000000-0000-4000-8000-000000000008', 'Red · 50 cl', 2.70, 'Red', '/products/red.webp', true),
('86000000-0000-4000-8000-000000000009', 'Red · duo 50 cl', 5.10, 'Red', '/products/red.webp', true),
('86000000-0000-4000-8000-000000000010', 'Red · coffret 4 canettes', 9.90, 'Red', '/products/red.webp', true)
on conflict (id) do nothing;

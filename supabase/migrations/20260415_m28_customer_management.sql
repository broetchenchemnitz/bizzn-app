-- M28: Kundenverwaltung — Pro-Restaurant Kundensperre
-- Ermöglicht es Gastronomen, einzelne Kunden für ihr Restaurant zu sperren

ALTER TABLE public.restaurant_customers ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE public.restaurant_customers ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.restaurant_customers ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.restaurant_customers ADD COLUMN IF NOT EXISTS banned_by text;

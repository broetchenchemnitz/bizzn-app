-- Add in_store_enabled to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS in_store_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.projects.in_store_enabled IS 'M24: Flag to enable or disable in-store (dine-in) ordering for the restaurant';

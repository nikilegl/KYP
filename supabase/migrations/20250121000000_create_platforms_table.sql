-- Create platforms table
CREATE TABLE IF NOT EXISTS public.platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    colour TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'Server',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes
CREATE INDEX IF NOT EXISTS platforms_workspace_id_idx ON public.platforms(workspace_id);
CREATE INDEX IF NOT EXISTS platforms_name_idx ON public.platforms(name);

-- Enable RLS
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view platforms in their workspace" ON public.platforms;
DROP POLICY IF EXISTS "Users can create platforms in their workspace" ON public.platforms;
DROP POLICY IF EXISTS "Users can update platforms in their workspace" ON public.platforms;
DROP POLICY IF EXISTS "Users can delete platforms in their workspace" ON public.platforms;

-- Create RLS policies
CREATE POLICY "Users can view platforms in their workspace"
    ON public.platforms
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create platforms in their workspace"
    ON public.platforms
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update platforms in their workspace"
    ON public.platforms
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete platforms in their workspace"
    ON public.platforms
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_platforms_updated_at ON public.platforms;
CREATE TRIGGER update_platforms_updated_at
    BEFORE UPDATE ON public.platforms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platforms
INSERT INTO public.platforms (name, description, colour, icon, workspace_id)
SELECT 
    default_platforms.name,
    default_platforms.description,
    default_platforms.colour,
    default_platforms.icon,
    workspaces.id as workspace_id
FROM (
    VALUES 
        ('CMS', 'Content Management System', '#8B5CF6', 'Database'),
        ('Legl', 'Legl Platform', '#3B82F6', 'Zap'),
        ('End client', 'End Client Systems', '#10B981', 'User'),
        ('Back end', 'Backend Services', '#6B7280', 'Server'),
        ('Third party', 'Third Party Services', '#F59E0B', 'ExternalLink')
) AS default_platforms(name, description, colour, icon)
CROSS JOIN public.workspaces
WHERE NOT EXISTS (
    SELECT 1 FROM public.platforms 
    WHERE platforms.workspace_id = workspaces.id
    LIMIT 1
);


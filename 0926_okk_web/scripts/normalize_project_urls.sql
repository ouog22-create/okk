-- Run after deploying previous_slugs support. Re-running is safe.
-- Keep existing portfolio-number URLs, including imported eight-digit IDs.
BEGIN;
SELECT pg_advisory_xact_lock(20260926);
DO $$
DECLARE
    project record;
    new_slug text;
    aliases jsonb;
BEGIN
    FOR project IN
        SELECT id, slug, draft, published FROM okk_private.projects
        WHERE slug !~ '^portfolio-[0-9]+$' ORDER BY id FOR UPDATE
    LOOP
        LOOP
            new_slug := 'portfolio-' || (100000000 + floor(random() * 900000000)::integer)::text;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM okk_private.projects WHERE slug = new_slug);
        END LOOP;
        aliases := COALESCE(project.draft::jsonb->'previous_slugs', '[]'::jsonb);
        IF NOT aliases @> jsonb_build_array(project.slug) THEN
            aliases := aliases || jsonb_build_array(project.slug);
        END IF;
        UPDATE okk_private.projects
        SET slug = new_slug,
            draft = (project.draft::jsonb || jsonb_build_object('slug', new_slug, 'previous_slugs', aliases))::text,
            published = CASE WHEN project.published IS NULL THEN NULL ELSE
                (project.published::jsonb || jsonb_build_object('slug', new_slug, 'previous_slugs', aliases))::text END,
            version = version + 1
        WHERE id = project.id;
    END LOOP;
END $$;
COMMIT;

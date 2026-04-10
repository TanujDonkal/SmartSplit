ALTER TABLE "users"
ADD COLUMN "username" TEXT;

WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN NULLIF(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]+', '_', 'g'), '') IS NULL
        THEN 'user'
      ELSE regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]+', '_', 'g')
    END AS base_username,
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN NULLIF(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]+', '_', 'g'), '') IS NULL
            THEN 'user'
          ELSE regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]+', '_', 'g')
        END
      ORDER BY created_at, id
    ) AS sequence
  FROM "users"
)
UPDATE "users" AS users
SET "username" = CASE
  WHEN normalized.sequence = 1 THEN normalized.base_username
  ELSE normalized.base_username || '_' || normalized.sequence::text
END
FROM normalized
WHERE users.id = normalized.id;

ALTER TABLE "users"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Opening-hour exceptions (holidays, closures, special hours) may not overlap,
-- so every calendar date resolves to exactly one rule.
ALTER TABLE "opening_exceptions"
  ADD CONSTRAINT "opening_exceptions_no_overlap"
  EXCLUDE USING gist (daterange("starts_on", "ends_on", '[]') WITH &&);
--> statement-breakpoint
-- Every weekday always exists; periods are attached to it.
INSERT INTO "opening_days" ("weekday") VALUES (1),(2),(3),(4),(5),(6),(7) ON CONFLICT DO NOTHING;

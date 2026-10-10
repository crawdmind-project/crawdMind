-- Prevent old merge aliases becoming visible again when their target is deleted.
ALTER TABLE "Idea" DROP CONSTRAINT "Idea_mergedIntoId_fkey";
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_mergedIntoId_fkey"
FOREIGN KEY ("mergedIntoId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "repository" TEXT;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "cloneUrl" TEXT,
ADD COLUMN     "repository" TEXT;

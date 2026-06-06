-- CreateEnum
CREATE TYPE "Department" AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'DEVOPS', 'QA', 'UI_UX');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubRepoUrl" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" "Department" NOT NULL DEFAULT 'FULLSTACK';

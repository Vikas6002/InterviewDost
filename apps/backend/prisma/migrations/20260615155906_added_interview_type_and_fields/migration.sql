/*
  Warnings:

  - Added the required column `type` to the `Interview` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('GitHub', 'Resume');

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "jobRole" TEXT,
ADD COLUMN     "resumeText" TEXT,
ADD COLUMN     "type" "InterviewType" NOT NULL,
ALTER COLUMN "githubMetadata" DROP NOT NULL;

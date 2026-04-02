-- Remove duplicate attempts/results so unique constraints can be applied
DELETE FROM "Attempt" t1
USING "Attempt" t2
WHERE t1.id > t2.id
  AND t1."studentId" = t2."studentId"
  AND t1."examId" = t2."examId";

DELETE FROM "Result" t1
USING "Result" t2
WHERE t1.id > t2.id
  AND t1."studentId" = t2."studentId"
  AND t1."examId" = t2."examId";

-- Exam creator
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Attempt -> User, Exam
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Result -> User, Exam
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Result" ADD CONSTRAINT "Result_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One attempt / one result per student per exam
CREATE UNIQUE INDEX "Attempt_studentId_examId_key" ON "Attempt"("studentId", "examId");
CREATE UNIQUE INDEX "Result_studentId_examId_key" ON "Result"("studentId", "examId");

-- Cascade delete questions when exam is deleted
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_examId_fkey";
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Attempt_status_idx" ON "Attempt"("status");

-- CreateIndex
CREATE INDEX "Attempt_examId_status_idx" ON "Attempt"("examId", "status");

-- CreateIndex
CREATE INDEX "ExamAssignment_examId_idx" ON "ExamAssignment"("examId");

-- CreateIndex
CREATE INDEX "Result_examId_idx" ON "Result"("examId");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_role_collegeCode_idx" ON "User"("role", "collegeCode");

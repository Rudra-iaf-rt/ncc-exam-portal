-- CreateTable
CREATE TABLE "ExamViolation" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamHeartbeat" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "activeQuestionIndex" INTEGER,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "userId" INTEGER,
    "sentById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamViolation_studentId_examId_idx" ON "ExamViolation"("studentId", "examId");

-- CreateIndex
CREATE INDEX "ExamViolation_examId_createdAt_idx" ON "ExamViolation"("examId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExamHeartbeat_studentId_examId_key" ON "ExamHeartbeat"("studentId", "examId");

-- CreateIndex
CREATE INDEX "ExamHeartbeat_examId_lastSeenAt_idx" ON "ExamHeartbeat"("examId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_sentById_createdAt_idx" ON "Notification"("sentById", "createdAt");

-- AddForeignKey
ALTER TABLE "ExamViolation" ADD CONSTRAINT "ExamViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamViolation" ADD CONSTRAINT "ExamViolation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHeartbeat" ADD CONSTRAINT "ExamHeartbeat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHeartbeat" ADD CONSTRAINT "ExamHeartbeat_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

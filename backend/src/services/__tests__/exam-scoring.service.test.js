const { normalizeAnswer, stripAnswersFromExam, scoreSubmission } = require('../exam-scoring.service');

describe('exam-scoring.service', () => {
  describe('normalizeAnswer', () => {
    it('should trim and normalize strings', () => {
      expect(normalizeAnswer(' A ')).toBe('A');
      expect(normalizeAnswer(null)).toBe('');
      expect(normalizeAnswer(undefined)).toBe('');
      expect(normalizeAnswer(123)).toBe('123');
    });
  });

  describe('stripAnswersFromExam', () => {
    it('should omit answer fields from questions', () => {
      const exam = {
        id: 1,
        title: 'Test Exam',
        duration: 60,
        questions: [
          { id: 101, question: 'Q1', type: 'MCQ', options: ['A', 'B', 'C', 'D'], answer: 'A' }
        ]
      };

      const stripped = stripAnswersFromExam(exam, null);

      expect(stripped.id).toBe(1);
      expect(stripped.questions[0].id).toBe(101);
      expect(stripped.questions[0].answer).toBeUndefined(); // answer is missing
    });

    it('should deterministically shuffle options for the same user ID', () => {
      const exam = {
        id: 1,
        title: 'Test Exam',
        questions: [
          { id: 101, question: 'Q1', type: 'MCQ', options: ['A', 'B', 'C', 'D'], answer: 'A' }
        ]
      };

      const stripped1 = stripAnswersFromExam(exam, 5);
      const stripped2 = stripAnswersFromExam(exam, 5);
      const stripped3 = stripAnswersFromExam(exam, 6);

      // Same user -> same shuffle
      expect(stripped1.questions[0].options).toEqual(stripped2.questions[0].options);
      
      // Different user -> likely different shuffle (though small chance it's the same)
      // We test that it shuffles and maintains the same 4 options
      expect([...stripped1.questions[0].options].sort()).toEqual(['A', 'B', 'C', 'D']);
      expect([...stripped3.questions[0].options].sort()).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should NOT shuffle SUBJECTIVE questions or questions with no options', () => {
      const exam = {
        id: 1,
        title: 'Test Exam',
        questions: [
          { id: 101, question: 'Q1', type: 'SUBJECTIVE', options: ['A', 'B'], answer: 'A' },
          { id: 102, question: 'Q2', type: 'MCQ', options: [], answer: 'A' }
        ]
      };

      const stripped = stripAnswersFromExam(exam, 5);
      expect(stripped.questions[0].options).toEqual(['A', 'B']); // Subjective untouched
      expect(stripped.questions[1].options).toEqual([]); // empty untouched
    });
  });

  describe('scoreSubmission', () => {
    const questions = [
      { id: 1, type: 'MCQ', answer: 'A' },
      { id: 2, type: 'MCQ', answer: 'B' },
      { id: 3, type: 'FILL_IN_THE_BLANK', answer: 'Newton' },
      { id: 4, type: 'SUBJECTIVE' } // should be ignored for auto-scoring
    ];

    it('should correctly score all correct answers', () => {
      const answers = [
        { questionId: 1, selectedAnswer: 'A' },
        { questionId: 2, selectedAnswer: 'B' },
        { questionId: 3, selectedAnswer: 'newton' } // case insensitive for fill-in-the-blank
      ];

      const res = scoreSubmission(questions, answers, { positiveMarks: 4, negativeMarking: false });

      expect(res.correct).toBe(3);
      expect(res.wrong).toBe(0);
      expect(res.skipped).toBe(0);
      expect(res.totalAutoScored).toBe(3);
      expect(res.rawScore).toBe(12); // 3 * 4
      expect(res.score).toBe(100); // 12/12 = 100%
      expect(res.hasPendingSubjective).toBe(true);
    });

    it('should correctly score mixed answers with negative marking', () => {
      const answers = [
        { questionId: 1, selectedAnswer: 'A' }, // Correct (+4)
        { questionId: 2, selectedAnswer: 'C' }, // Wrong (-1)
        { questionId: 3, selectedAnswer: '' } // Skipped (0)
      ];

      const res = scoreSubmission(questions, answers, { positiveMarks: 4, negativeMarking: true, negativeMarks: 1 });

      expect(res.correct).toBe(1);
      expect(res.wrong).toBe(1);
      expect(res.skipped).toBe(1);
      
      // raw = 1*4 - 1*1 = 3
      // max = 3*4 = 12
      // 3/12 * 100 = 25%
      expect(res.rawScore).toBe(3);
      expect(res.score).toBe(25);
    });

    it('should prevent negative final percentage scores', () => {
      const answers = [
        { questionId: 1, selectedAnswer: 'C' }, // Wrong (-1)
        { questionId: 2, selectedAnswer: 'C' }, // Wrong (-1)
        { questionId: 3, selectedAnswer: 'C' }  // Wrong (-1)
      ];

      const res = scoreSubmission(questions, answers, { positiveMarks: 4, negativeMarking: true, negativeMarks: 1 });

      expect(res.rawScore).toBe(-3);
      expect(res.score).toBe(0); // Clamped to 0
    });
    
    it('should handle zero questions gracefully', () => {
      const res = scoreSubmission([], [], { positiveMarks: 4 });
      expect(res.score).toBe(0);
      expect(res.rawScore).toBe(0);
      expect(res.maxScore).toBe(0);
    });
  });
});

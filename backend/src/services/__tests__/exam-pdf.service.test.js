const { extractPdfText, parseQuestionsHeuristic, buildQuestionsFromPdfText } = require('../exam-pdf.service');
const { HttpError } = require('../../utils/http-error');
const pdfParse = require('pdf-parse');

jest.mock('pdf-parse', () => jest.fn());

describe('exam-pdf.service', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('extractPdfText', () => {
    it('should throw if buffer is invalid', async () => {
      await expect(extractPdfText(null)).rejects.toThrow('Invalid PDF buffer');
      await expect(extractPdfText('string')).rejects.toThrow('Invalid PDF buffer');
    });

    it('should return text from pdfParse', async () => {
      pdfParse.mockResolvedValueOnce({ text: 'parsed text' });
      const text = await extractPdfText(Buffer.from('data'));
      expect(text).toBe('parsed text');
    });

    it('should return empty string if no text', async () => {
      pdfParse.mockResolvedValueOnce({});
      const text = await extractPdfText(Buffer.from('data'));
      expect(text).toBe('');
    });
  });

  describe('parseQuestionsHeuristic', () => {
    it('should parse questions correctly with heuristic', () => {
      const text = `
1. What is the capital of France?
A) Berlin
B) Paris
C) Madrid
D) Rome
Answer: B

2. What is 2 + 2?
A. 3
B. 4
C. 5
Answer: 4
      `;

      const q = parseQuestionsHeuristic(text);
      expect(q.length).toBe(2);
      
      expect(q[0].question).toBe('What is the capital of France?');
      expect(q[0].options).toEqual(['Berlin', 'Paris', 'Madrid', 'Rome']);
      expect(q[0].answer).toBe('Paris'); // Option B

      expect(q[1].question).toBe('What is 2 + 2?');
      expect(q[1].options).toEqual(['3', '4', '5', '(Option 4)']); // Padded
      expect(q[1].answer).toBe('4'); // Text match
    });
  });

  describe('buildQuestionsFromPdfText', () => {
    it('should throw if text is too short', async () => {
      await expect(buildQuestionsFromPdfText('short')).rejects.toThrow('Could not read enough text');
    });

    it('should use heuristic if OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      const text = '1. This is a longer question to pass the length check?\nA) 1\nB) 2\nAnswer: A';
      
      const q = await buildQuestionsFromPdfText(text);
      expect(q.length).toBe(1);
      expect(q[0].question).toBe('This is a longer question to pass the length check?');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use OpenAI if OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: JSON.stringify({ questions: [{ question: 'AI Q', options: ['A', 'B', 'C', 'D'], answer: 'A' }] }) } }
          ]
        })
      });

      const text = 'Some long text that goes on for a bit so it passes the length check.';
      const q = await buildQuestionsFromPdfText(text);

      expect(q.length).toBe(1);
      expect(q[0].question).toBe('AI Q');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should fallback to heuristic if OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Server error'
      }); // Will throw

      const text = '1. This is a longer heuristic question to pass length?\nA) 1\nB) 2\nAnswer: A';
      const q = await buildQuestionsFromPdfText(text);

      expect(q.length).toBe(1);
      expect(q[0].question).toBe('This is a longer heuristic question to pass length?');
    });

    it('should throw if both AI and heuristic yield no questions', async () => {
      delete process.env.OPENAI_API_KEY;
      const text = 'Just some random text that does not look like questions at all.' + ' '.repeat(50);
      
      await expect(buildQuestionsFromPdfText(text)).rejects.toThrow('Could not extract multiple-choice questions');
    });
  });
});

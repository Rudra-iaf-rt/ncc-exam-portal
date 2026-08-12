const { extractQuestionsFromExcelBuffer } = require('../exam-excel.service');
const { HttpError } = require('../../utils/http-error');
const XLSX = require('xlsx');

jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));

describe('exam-excel.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractQuestionsFromExcelBuffer', () => {
    it('should throw if buffer is invalid', async () => {
      await expect(extractQuestionsFromExcelBuffer(null)).rejects.toThrow('Invalid Excel buffer');
      await expect(extractQuestionsFromExcelBuffer('string')).rejects.toThrow('Invalid Excel buffer');
    });

    it('should throw if XLSX fails to read', async () => {
      XLSX.read.mockImplementationOnce(() => { throw new Error('Bad data'); });
      await expect(extractQuestionsFromExcelBuffer(Buffer.from('bad'))).rejects.toThrow('Could not read Excel file');
    });

    it('should throw if no sheets found', async () => {
      XLSX.read.mockReturnValueOnce({ SheetNames: [] });
      await expect(extractQuestionsFromExcelBuffer(Buffer.from('data'))).rejects.toThrow('Excel file has no sheets');
    });

    it('should throw if no valid questions found', async () => {
      XLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      XLSX.utils.sheet_to_json.mockReturnValueOnce([]); // Empty rows

      await expect(extractQuestionsFromExcelBuffer(Buffer.from('data'))).rejects.toThrow('No valid questions found');
    });

    it('should throw if row has < 2 options', async () => {
      XLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      XLSX.utils.sheet_to_json.mockReturnValueOnce([
        { question: 'What?', optionA: 'Yes', answer: 'A' }
      ]);

      await expect(extractQuestionsFromExcelBuffer(Buffer.from('data'))).rejects.toThrow('Row 2: at least two options are required');
    });

    it('should throw if answer is invalid', async () => {
      XLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      XLSX.utils.sheet_to_json.mockReturnValueOnce([
        { question: 'What?', optionA: 'Yes', optionB: 'No', answer: 'InvalidAnswer' }
      ]);

      await expect(extractQuestionsFromExcelBuffer(Buffer.from('data'))).rejects.toThrow('Row 2: answer is required');
    });

    it('should parse valid questions with different answer formats', async () => {
      XLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      XLSX.utils.sheet_to_json.mockReturnValueOnce([
        // A/B/C/D format
        { question: 'Q1', optionA: 'Opt1', optionB: 'Opt2', answer: 'A' },
        // Direct text match format
        { question: 'Q2', optionA: 'Apple', optionB: 'Banana', answer: 'Banana' },
        // Loose text match format (case insensitive)
        { question: 'Q3', optionA: 'Cat', optionB: 'Dog', answer: 'cat' }
      ]);

      const result = await extractQuestionsFromExcelBuffer(Buffer.from('data'));
      
      expect(result.length).toBe(3);
      expect(result[0].question).toBe('Q1');
      expect(result[0].options[0]).toBe('Opt1');
      expect(result[0].answer).toBe('Opt1'); // mapped from 'A'

      expect(result[1].answer).toBe('Banana');
      expect(result[2].answer).toBe('Cat');
    });
    
    it('should pad options to 4 if less than 4 provided', async () => {
      XLSX.read.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
      XLSX.utils.sheet_to_json.mockReturnValueOnce([
        { question: 'Q1', optionA: 'Opt1', optionB: 'Opt2', answer: 'A' }
      ]);

      const result = await extractQuestionsFromExcelBuffer(Buffer.from('data'));
      
      expect(result[0].options.length).toBe(4);
      expect(result[0].options[2]).toBe('(Option 3)');
      expect(result[0].options[3]).toBe('(Option 4)');
    });
  });
});

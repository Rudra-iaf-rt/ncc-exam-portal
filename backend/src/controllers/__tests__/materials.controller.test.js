const materialsController = require('../materials.controller');
const materialsService = require('../../services/materials.service');
const fs = require('fs');

jest.mock('../../services/materials.service', () => ({
  createMaterial: jest.fn(),
  listMaterials: jest.fn(),
  getMaterialForDownload: jest.fn(),
  getMaterialById: jest.fn(),
  deleteMaterialById: jest.fn(),
  updateMaterial: jest.fn(),
  bulkDisableMaterials: jest.fn(),
  bulkVerifyMaterials: jest.fn(),
}));
jest.mock('fs', () => ({
  createReadStream: jest.fn()
}));

describe('materials.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {},
      file: undefined
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn()
    };
  });

  describe('upload', () => {
    it('should reject if no file', async () => {
      await materialsController.upload(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should upload material', async () => {
      req.file = { buffer: Buffer.from('test') };
      materialsService.createMaterial.mockResolvedValueOnce({ id: 1 });
      await materialsController.upload(req, res);
      expect(materialsService.createMaterial).toHaveBeenCalledWith(1, req.file, req.body, req.user);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('list', () => {
    it('should list materials', async () => {
      materialsService.listMaterials.mockResolvedValueOnce([{ id: 1 }]);
      await materialsController.list(req, res);
      expect(materialsService.listMaterials).toHaveBeenCalledWith({ user: req.user });
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe('download', () => {
    it('should redirect for drive materials', async () => {
      materialsService.getMaterialForDownload.mockResolvedValueOnce({ isDrive: true, url: 'http://drive' });
      await materialsController.download(req, res);
      expect(res.redirect).toHaveBeenCalledWith('http://drive');
    });

    it('should stream B2 materials', async () => {
      const mockStream = { pipe: jest.fn() };
      materialsService.getMaterialForDownload.mockResolvedValueOnce({
        isB2: true,
        contentType: 'application/pdf',
        contentLength: 100,
        stream: mockStream,
        material: { originalName: 'test.pdf' }
      });
      await materialsController.download(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should stream local disk materials', async () => {
      const mockStream = { pipe: jest.fn(), on: jest.fn() };
      fs.createReadStream.mockReturnValueOnce(mockStream);
      materialsService.getMaterialForDownload.mockResolvedValueOnce({
        material: { mimeType: 'application/pdf', originalName: 'test.pdf' },
        filePath: '/tmp/test.pdf'
      });
      await materialsController.download(req, res);
      expect(fs.createReadStream).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('view', () => {
    it('should redirect for drive materials', async () => {
      materialsService.getMaterialForDownload.mockResolvedValueOnce({ isDrive: true, url: 'http://drive' });
      await materialsController.view(req, res);
      expect(res.redirect).toHaveBeenCalledWith('http://drive');
    });

    it('should stream B2 materials inline', async () => {
      const mockStream = { pipe: jest.fn() };
      materialsService.getMaterialForDownload.mockResolvedValueOnce({
        isB2: true,
        contentType: 'application/pdf',
        contentLength: 100,
        stream: mockStream,
        material: { originalName: 'test.pdf' }
      });
      await materialsController.view(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should stream local disk materials inline', async () => {
      const mockStream = { pipe: jest.fn(), on: jest.fn() };
      fs.createReadStream.mockReturnValueOnce(mockStream);
      materialsService.getMaterialForDownload.mockResolvedValueOnce({
        material: { mimeType: 'application/pdf', originalName: 'test.pdf' },
        filePath: '/tmp/test.pdf'
      });
      await materialsController.view(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline');
      expect(fs.createReadStream).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('getOne', () => {
    it('should get one', async () => {
      materialsService.getMaterialById.mockResolvedValueOnce({ id: 1 });
      await materialsController.getOne(req, res);
      expect(res.json).toHaveBeenCalledWith({ material: { id: 1 } });
    });
  });

  describe('remove', () => {
    it('should remove', async () => {
      materialsService.deleteMaterialById.mockResolvedValueOnce({ ok: true });
      await materialsController.remove(req, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('update', () => {
    it('should update', async () => {
      req.params.id = '1';
      req.body = { title: 'New' };
      materialsService.updateMaterial.mockResolvedValueOnce({ id: 1 });
      await materialsController.update(req, res);
      expect(materialsService.updateMaterial).toHaveBeenCalledWith('1', req.body, req.user);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('bulkDisable', () => {
    it('should validate inputs', async () => {
      await materialsController.bulkDisable(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should bulk disable', async () => {
      req.body = { materialIds: [1, 2] };
      materialsService.bulkDisableMaterials.mockResolvedValueOnce({ count: 2 });
      await materialsController.bulkDisable(req, res);
      expect(materialsService.bulkDisableMaterials).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('bulkVerify', () => {
    it('should validate inputs', async () => {
      await materialsController.bulkVerify(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should bulk verify', async () => {
      req.body = { materialIds: [1, 2] };
      materialsService.bulkVerifyMaterials.mockResolvedValueOnce({ count: 2 });
      await materialsController.bulkVerify(req, res);
      expect(materialsService.bulkVerifyMaterials).toHaveBeenCalledWith([1, 2]);
    });
  });
});

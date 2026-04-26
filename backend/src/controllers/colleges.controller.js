const collegesService = require('../services/colleges.service');

async function list(req, res) {
  // Instructors get active-only; Admins get all (including inactive)
  const data = req.user.role === 'ADMIN'
    ? await collegesService.listCollegesAll()
    : await collegesService.listColleges();
  res.json({ colleges: data });
}

async function create(req, res) {
  const college = await collegesService.createCollege(req.body);
  res.status(201).json({ college });
}

async function update(req, res) {
  const college = await collegesService.updateCollege(req.params.id, req.body);
  res.json({ college });
}

async function deactivate(req, res) {
  const college = await collegesService.deactivateCollege(req.params.id);
  res.json({ college });
}

module.exports = { list, create, update, deactivate };

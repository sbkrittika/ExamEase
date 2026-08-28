const express = require('express');
const multer = require('multer');

const upload = multer();

const {
  addExam,
  getExams,
  updateExam,
  deleteExam,
  uploadZip,
  allocate,
  getAllocations
} = require('../controllers/examController');

const {
  authenticate,
  allowRoles
} = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  allowRoles('faculty'),
  addExam
);

router.get(
  '/',
  allowRoles('faculty'),
  getExams
);

router.put(
  '/:id',
  allowRoles('faculty'),
  updateExam
);

router.delete(
  '/:id',
  allowRoles('faculty'),
  deleteExam
);

router.post(
  '/upload-zip',
  allowRoles('faculty'),
  upload.single('file'),
  uploadZip
);

router.post(
  '/allocate',
  allowRoles('faculty'),
  allocate
);

router.get(
  '/:id/allocations',
  allowRoles('faculty'),
  getAllocations
);

module.exports = router;

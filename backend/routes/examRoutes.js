const express = require("express");
const multer = require('multer');
const upload = multer();

const {
    addExam,
    getExams,
    uploadZip,
    allocate
} = require("../controllers/examController");

const router = express.Router();

router.post("/", addExam);
router.get("/", getExams);

// Upload a ZIP containing an .xlsx student list (multipart/form-data file field: file)
router.post('/upload-zip', upload.single('file'), uploadZip);

// Allocate students to rooms
router.post('/allocate', allocate);

module.exports = router;
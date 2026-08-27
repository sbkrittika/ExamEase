const express = require("express");
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
} = require("../controllers/examController");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.post("/", allowRoles("faculty"), addExam);
router.get("/", allowRoles("faculty"), getExams);
router.put("/:id", allowRoles("faculty"), updateExam);
router.delete("/:id", allowRoles("faculty"), deleteExam);

// Upload a ZIP containing an .xlsx student list (multipart/form-data file field: file)
router.post('/upload-zip', allowRoles("faculty"), upload.single('file'), uploadZip);

// Allocate students to rooms
router.post('/allocate', allowRoles("faculty"), allocate);
router.get("/:id/allocations", getAllocations);

module.exports = router;
const express = require("express");

const {
    addExam,
    getExams
} = require("../controllers/examController");

const router = express.Router();


router.post("/", addExam);


router.get("/", getExams);

module.exports = router;
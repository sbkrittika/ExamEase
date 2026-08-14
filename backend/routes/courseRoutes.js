const express = require("express");

const {
    addCourse,
    getCourses
} = require("../controllers/courseController");

const router = express.Router();


router.post("/", addCourse);


router.get("/", getCourses);

module.exports = router;
const express = require("express");

const {
    addCourse,
    getCourses,
    deleteCourse
} = require("../controllers/courseController");

const router = express.Router();


router.post("/", addCourse);


router.get("/", getCourses);
router.delete("/:code", deleteCourse);

module.exports = router;
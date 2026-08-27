const express = require("express");

const {
    addCourse,
    getCourses,
    deleteCourse
} = require("../controllers/courseController");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();


router.use(authenticate);
router.post("/", allowRoles("faculty"), addCourse);


router.get("/", allowRoles("faculty"), getCourses);
router.delete("/:code/:section", allowRoles("faculty"), deleteCourse);

module.exports = router;
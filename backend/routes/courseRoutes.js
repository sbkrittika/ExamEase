const express = require("express");

const {
    addCourse,
    getCourses,
    deleteCourse,
    updateCourse
} = require("../controllers/courseController");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();


router.use(authenticate);
router.post("/", allowRoles("faculty"), addCourse);


router.get("/", allowRoles("faculty"), getCourses);
router.put("/:code/:section", allowRoles("faculty"), updateCourse);
router.delete("/:code/:section", allowRoles("faculty"), deleteCourse);

module.exports = router;
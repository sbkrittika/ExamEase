const express = require("express");
const {
    listStudents, listStudentCourses, enrollStudent, removeEnrollment, listCourseStudents,
    saveStudent, updateStudent, deleteStudent, listFaculty,
    listRooms, saveRoom, deleteRoom, dashboard, mySchedule, saveFaculty,
    listAssignments, assignInvigilator, removeAssignment
} = require("../controllers/resourceController");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.get("/dashboard", allowRoles("faculty"), dashboard);
router.get("/me", mySchedule);
router.get("/students", allowRoles("faculty"), listStudents);
router.post("/students", allowRoles("faculty"), saveStudent);
router.put("/students/:id", allowRoles("faculty"), updateStudent);
router.delete("/students/:id", allowRoles("faculty"), deleteStudent);
router.get("/students/:id/courses", allowRoles("faculty"), listStudentCourses);
router.post("/students/:id/courses", allowRoles("faculty"), enrollStudent);
router.delete("/students/:id/courses/:courseCode/:section", allowRoles("faculty"), removeEnrollment);
router.get("/courses/:code/:section/students", allowRoles("faculty"), listCourseStudents);
router.get("/faculty", allowRoles("faculty"), listFaculty);
router.post("/faculty", allowRoles("faculty"), saveFaculty);
router.get("/rooms", allowRoles("faculty"), listRooms);
router.post("/rooms", allowRoles("faculty"), saveRoom);
router.delete("/rooms/:id", allowRoles("faculty"), deleteRoom);
router.get("/invigilation", allowRoles("faculty"), listAssignments);
router.post("/invigilation", allowRoles("faculty"), assignInvigilator);
router.delete("/invigilation/:id", allowRoles("faculty"), removeAssignment);
module.exports = router;

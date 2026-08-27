const express = require("express");
const {
    listStudents, saveStudent, deleteStudent, listFaculty,
    listRooms, saveRoom, deleteRoom, dashboard, mySchedule,
    listAssignments, assignInvigilator, removeAssignment
} = require("../controllers/resourceController");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.get("/dashboard", allowRoles("faculty"), dashboard);
router.get("/me", mySchedule);
router.get("/students", allowRoles("faculty"), listStudents);
router.post("/students", allowRoles("faculty"), saveStudent);
router.delete("/students/:id", allowRoles("faculty"), deleteStudent);
router.get("/faculty", allowRoles("faculty"), listFaculty);
router.get("/rooms", allowRoles("faculty"), listRooms);
router.post("/rooms", allowRoles("faculty"), saveRoom);
router.delete("/rooms/:id", allowRoles("faculty"), deleteRoom);
router.get("/invigilation", allowRoles("faculty"), listAssignments);
router.post("/invigilation", allowRoles("faculty"), assignInvigilator);
router.delete("/invigilation/:id", allowRoles("faculty"), removeAssignment);
module.exports = router;

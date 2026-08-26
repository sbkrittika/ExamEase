const express = require("express");
const { getFaculty, getRooms, getStudents, dashboard, addStudent, deleteStudent, addRoom, deleteRoom, addFaculty, deleteFaculty, getAssignments, addAssignment, deleteAssignment } = require("../controllers/dataController");

const router = express.Router();

router.get("/faculty", getFaculty);
router.post("/faculty", addFaculty);
router.delete("/faculty/:id", deleteFaculty);
router.get("/rooms", getRooms);
router.get("/students", getStudents);
router.get("/dashboard", dashboard);
router.post("/students", addStudent);
router.delete("/students/:id", deleteStudent);
router.post("/rooms", addRoom);
router.delete("/rooms/:id", deleteRoom);
router.get("/assignments", getAssignments);
router.post("/assignments", addAssignment);
router.delete("/assignments/:id", deleteAssignment);

module.exports = router;
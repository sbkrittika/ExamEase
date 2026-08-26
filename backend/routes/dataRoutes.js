const express = require("express");
const { getFaculty, getRooms, getStudents } = require("../controllers/dataController");

const router = express.Router();

router.get("/faculty", getFaculty);
router.get("/rooms", getRooms);
router.get("/students", getStudents);

module.exports = router;
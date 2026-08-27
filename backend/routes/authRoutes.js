const express = require("express");

const router = express.Router();

const {
    register,
    login,
    changeAdminCredentials
} = require("../controllers/authController");
const { authenticate, allowRoles } = require("../middleware/auth");

router.post("/register", register);

router.post("/login", login);

router.post(
    "/reset-admin",
    authenticate,
    allowRoles("faculty"),
    changeAdminCredentials
);

module.exports = router;
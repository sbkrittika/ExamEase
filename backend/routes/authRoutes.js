const express = require("express");

const router = express.Router();


    const {
    register,
    login,
    changeAdminCredentials
} = require("../controllers/authController");

router.post("/register", register);

router.post("/login", login);

router.post(
    "/reset-admin",
    resetAdminCredentials
);
module.exports = router;
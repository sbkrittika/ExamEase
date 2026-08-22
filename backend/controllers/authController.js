const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");



const UNIVERSITY_DOMAIN = "@eastdelta.edu.bd";


const STUDENT_EMAIL_REGEX = /^\d{9}@eastdelta\.edu\.bd$/i;


const FACULTY_EMAIL_REGEX =
    /^[a-z]+(?:[._-][a-z]+)+@eastdelta\.edu\.bd$/i;




const register = async (req, res) => {
    try {
        const {
            full_name,
            email,
            password,
            confirm_password,
            role,
            department,
            designation,
            phone
        } = req.body;

       

        if (
            !full_name ||
            !email ||
            !password ||
            !confirm_password ||
            !role ||
            !department
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name, email, password, confirm password, role and department are required."
            });
        }

        

        const cleanEmail = email.trim().toLowerCase();

      

        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

       

        if (role !== "student" && role !== "faculty") {
            return res.status(400).json({
                success: false,
                message: "Invalid account type."
            });
        }

      

        if (!cleanEmail.endsWith(UNIVERSITY_DOMAIN)) {
            return res.status(400).json({
                success: false,
                message:
                    "Only East Delta University email addresses are allowed."
            });
        }

      

        if (role === "student" && !STUDENT_EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message:
                    "Student email must be a valid 9-digit East Delta University student email."
            });
        }

        if (role === "faculty" && !FACULTY_EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message:
                    "Faculty email format is invalid. Example: jahidul.h@eastdelta.edu.bd"
            });
        }

     

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }



        const checkEmail =
            "SELECT user_id FROM users WHERE email = ?";

        db.query(
            checkEmail,
            [cleanEmail],
            async (err, results) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Database error.",
                        error: err.message
                    });
                }

                if (results.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: "This university email is already registered."
                    });
                }

              

                const hashedPassword = await bcrypt.hash(
                    password,
                    10
                );

                

                const sql = `
                    INSERT INTO users
                    (
                        full_name,
                        email,
                        password,
                        role,
                        designation,
                        department,
                        phone
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    sql,
                    [
                        full_name.trim(),
                        cleanEmail,
                        hashedPassword,
                        role,
                        designation || null,
                        department.trim(),
                        phone || null
                    ],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                message: "Failed to create account.",
                                error: err.message
                            });
                        }

                        return res.status(201).json({
                            success: true,
                            message:
                                "Account created successfully. You can now sign in.",
                            user_id: result.insertId
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }
};




const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    

    if (!cleanEmail.endsWith(UNIVERSITY_DOMAIN)) {
        return res.status(401).json({
            success: false,
            message:
                "Only East Delta University email addresses can sign in."
        });
    }

    const sql =
        "SELECT * FROM users WHERE email = ?";

    db.query(
        sql,
        [cleanEmail],
        async (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error.",
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message:
                        "No account found with this university email. Please create an account first."
                });
            }

            const user = results[0];

           

            if (
                user.role !== "student" &&
                user.role !== "faculty"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This account does not have a valid university role."
                });
            }

            

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            

            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    email: user.email,
                    role: user.role,
                    designation: user.designation,
                    department: user.department
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

            return res.json({
                success: true,
                message: "Login successful.",
                token: token,

                user: {
                    user_id: user.user_id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    designation: user.designation,
                    department: user.department,
                    phone: user.phone
                }
            });
        }
    );
};




const changeAdminCredentials = async (req, res) => {
    try {
        const {
            oldEmail,
            newEmail,
            newPassword
        } = req.body;

        if (!oldEmail || !newEmail || !newPassword) {
            return res.status(400).json({
                success: false,
                message:
                    "Old email, new email and new password are required."
            });
        }

        const cleanOldEmail =
            oldEmail.trim().toLowerCase();

        const cleanNewEmail =
            newEmail.trim().toLowerCase();

       
        if (!cleanNewEmail.endsWith(UNIVERSITY_DOMAIN)) {
            return res.status(400).json({
                success: false,
                message:
                    "New email must be an East Delta University email."
            });
        }

        const findUser =
            "SELECT * FROM users WHERE email = ?";

        db.query(
            findUser,
            [cleanOldEmail],
            async (err, results) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Database error.",
                        error: err.message
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Old email not found."
                    });
                }

                const checkNewEmail = `
                    SELECT user_id
                    FROM users
                    WHERE email = ?
                    AND email != ?
                `;

                db.query(
                    checkNewEmail,
                    [cleanNewEmail, cleanOldEmail],
                    async (err, existingUsers) => {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                message: "Database error.",
                                error: err.message
                            });
                        }

                        if (existingUsers.length > 0) {
                            return res.status(409).json({
                                success: false,
                                message:
                                    "New email already exists."
                            });
                        }

                        const hashedPassword =
                            await bcrypt.hash(
                                newPassword,
                                10
                            );

                        const updateSQL = `
                            UPDATE users
                            SET
                                email = ?,
                                password = ?
                            WHERE email = ?
                        `;

                        db.query(
                            updateSQL,
                            [
                                cleanNewEmail,
                                hashedPassword,
                                cleanOldEmail
                            ],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Failed to update credentials.",
                                        error: err.message
                                    });
                                }

                                return res.json({
                                    success: true,
                                    message:
                                        "Credentials changed successfully."
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error(
            "Credential update error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }
};


module.exports = {
    register,
    login,
    changeAdminCredentials
};
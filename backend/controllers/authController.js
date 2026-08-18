const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");



const register = async (req, res) => {
    try {
        const {
            full_name,
            email,
            password,
            designation,
            department,
            phone
        } = req.body;

        if (!full_name || !email || !password || !department) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name, email, password and department are required."
            });
        }

        const checkEmail =
            "SELECT user_id FROM users WHERE email = ?";

        db.query(checkEmail, [email], async (err, results) => {
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
                    message: "Email already exists."
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const sql = `
                INSERT INTO users
                (
                    full_name,
                    email,
                    password,
                    designation,
                    department,
                    phone
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(
                sql,
                [
                    full_name,
                    email,
                    hashedPassword,
                    designation || null,
                    department,
                    phone || null
                ],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Failed to create user.",
                            error: err.message
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: "User registered successfully.",
                        user_id: result.insertId
                    });
                }
            );
        });

    } catch (error) {
        res.status(500).json({
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

    const sql =
        "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {

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
                message: "Invalid email or password."
            });
        }

        const user = results[0];

      
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
                designation: user.designation,
                department: user.department
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful.",
            token: token,

            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                designation: user.designation,
                department: user.department,
                phone: user.phone
            }
        });
    });
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



        const findUser =
            "SELECT * FROM users WHERE email = ?";


        db.query(
            findUser,
            [oldEmail],
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
                    [newEmail, oldEmail],
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
                                newEmail,
                                hashedPassword,
                                oldEmail
                            ],
                            (err, result) => {

                                if (err) {

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Failed to update credentials.",
                                        error: err.message
                                    });

                                }


                                res.json({
                                    success: true,
                                    message:
                                        "Admin email and password changed successfully."
                                });

                            }
                        );

                    }
                );

            }
        );

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });

    }
};



module.exports = {
    register,
    login,
    changeAdminCredentials,
    
};
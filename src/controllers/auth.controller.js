import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "subpay_super_secret_key_2026";

// 1. Register a New User & Create their Wallet
export const signup = async (req, res) => {
  try {
    const { email, phone, password, firstName, lastName } = req.body;

    // Basic validation
    if (!email || !phone || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "All required fields must be provided.",
        });
    }

    // Check if user already exists using Prisma 8 .first()
    const existingUser = await db.orm.public.User.first({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ status: "error", message: "Email is already registered." });
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and automatically initialize their default NGN wallet using Prisma 8 syntax
    const newUser = await db.orm.public.User.create({
      email,
      phone,
      passwordHash,
      firstName,
      lastName,
      wallet: (w) =>
        w.create({
          balance: 0.0,
          currency: "NGN",
          status: "ACTIVE",
        }),
    });

    // Remove passwordHash before sending response
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      status: "success",
      message: "Account created successfully! Wallet initialized.",
      data: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to register user",
      error: error.message,
    });
  }
};

// 2. User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "Email and password are required." });
    }

    // Find user by email using Prisma 8 .first()
    const user = await db.orm.public.User.first({ email });

    if (!user) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid email or password." });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid email or password." });
    }

    // Generate JWT Token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      status: "success",
      message: "Login successful!",
      token,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Login failed",
      error: error.message,
    });
  }
};

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "subpay_super_secret_key_2026";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ status: "error", message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attaches { userId, email } to the request object
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ status: "error", message: "Invalid or expired token." });
  }
};

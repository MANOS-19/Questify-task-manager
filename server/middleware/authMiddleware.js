const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Check whether JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error"
      });
    }

    // 2. Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // 3. Extract token
    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing"
      });
    }

    // 4. Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

 // 5. Validate decoded user ID
if (
  typeof decoded.userId !== "string" ||
  !/^[a-fA-F0-9]{24}$/.test(decoded.userId)
) {
  return res.status(401).json({
    success: false,
    message: "Invalid authentication token"
  });
}

    // 6. Find authenticated user in MongoDB
    const user = await User.findById(decoded.userId)
      .select("_id name email");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // 7. Attach authenticated user to request
    req.user = user;

    // 8. Continue to the protected route
    return next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired"
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal authentication error"
    });
  }
};

module.exports = authMiddleware;
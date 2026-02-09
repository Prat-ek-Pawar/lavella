const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const { loginLimiter } = require("../middleware/rateLimitMiddleware");

const path = require("path");

// Public routes
// Serve admin dashboard at /api/admin
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/dashboard.html"));
});

router.post("/login", loginLimiter, adminController.loginAdmin);

// Protected route for initial admin creation (you might want to disable this after first admin)
router.post("/create", authMiddleware, adminController.createAdmin);

// Verify token
router.get("/verify", authMiddleware, adminController.verifyToken);

module.exports = router;

// server.js
const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

// Load env
dotenv.config();

// DB connection (kept as your module)
const dbConnect = require("./config/DBConnect");

// Middleware
const compressionMiddleware = require("./middleware/compressionMiddleware");
const errorHandlerMiddleware = require("./middleware/errorHandlerMiddleware");
const { apiLimiter } = require("./middleware/rateLimitMiddleware");

// Routes
const productRoutes = require("./routes/productRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// --- Security ---
app.set("trust proxy", 1);
// Allow cross-origin images/fonts (don’t block by CORP). Keep Helmet on.
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

// --- Fully open CORS that supports credentials & file:// ---
// If the browser sends credentials, '*' is not allowed. We reflect the Origin.
// When opened from disk, Origin is absent; browsers treat that as 'null'.
// We explicitly set 'null' so credentialed requests from file:// also work.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With, Accept",
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- Logging ---
if ((process.env.NODE_ENV || "development") === "development") {
  app.use(morgan("dev"));
}

// Custom request logger to debug 404s
app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = function (data) {
    if (res.statusCode === 404) {
      console.log(
        `[404 DEBUG] URL: ${req.originalUrl} - Method: ${req.method} - IP: ${req.ip}`,
      );
    }
    return oldJson.apply(res, arguments);
  };
  next();
});

// --- Parsers ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Compression ---
app.use(compressionMiddleware);

// --- Rate limit (keep as-is for /api/*) ---
app.use("/api/", apiLimiter);
app.set("etag", false);
// --- Static (uploads & public) ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// --- API Routes ---
app.use("/api/products", productRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/upload", uploadRoutes);

// --- Admin Redirect ---
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin/dashboard.html"));
});

// --- Health ---
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// --- Error handler (last) ---
app.use(errorHandlerMiddleware);

// --- DB connect (non-blocking log) ---
(async () => {
  try {
    await dbConnect();
    console.log("✅ Database connected");
  } catch (e) {
    console.error("❌ Database connection failed:", e?.message || e);
    // Decide if you want to exit here:
    // process.exit(1);
  }
})();

// --- Start ---
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  const env = process.env.NODE_ENV || "development";
  console.log(
    `Server running in ${env} at http://127.0.0.1:${PORT} latest commit `,
  );
  console.log(`Health:     http://127.0.0.1:${PORT}/api/health`);
  console.log(`Categories: http://127.0.0.1:${PORT}/api/categories`);
});

// --- Hardening / graceful shutdown ---
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  // process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = app;

// api/index.js — Vercel serverless function entry point.
// Vercel detects any file under /api as a function; this just hands the
// request to the same Express app used for local development.
module.exports = require("../lib/app");

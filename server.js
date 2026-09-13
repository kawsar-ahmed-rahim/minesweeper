// server.js — runs the app locally with `npm start` / `node server.js`.
// On Vercel, this file isn't used at all — api/index.js handles requests
// instead, both sharing the same Express app from lib/app.js.
const app = require("./lib/app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Minesweeper server running at http://localhost:${PORT}`);
});

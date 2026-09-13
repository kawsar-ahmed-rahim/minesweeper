// lib/app.js — the actual Express app, shared between local dev (server.js)
// and the Vercel serverless function (api/index.js).
//
// Same pattern as the hangman and battleship versions of this idea:
// authoritative state (the mine board, and which cells are revealed)
// needs to persist across many requests, but each request spawns a
// fresh, stateless C process. So the board lives in an httpOnly cookie
// on the server side — the browser carries it automatically, but page
// JavaScript never sees where the mines actually are.
const express = require("express");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const SOURCE_BINARY = path.join(__dirname, "..", "minesweeper");
const COOKIE_NAME = "minesweeper_state";

// Same read-only-filesystem / lost-executable-bit workaround as the
// other projects: on Vercel, copy the bundled binary into /tmp (the one
// writable, executable location) before running it.
function resolveBinaryPath() {
  if (!process.env.VERCEL) {
    return SOURCE_BINARY;
  }
  const tmpBinary = path.join(os.tmpdir(), "minesweeper");
  try {
    if (!fs.existsSync(tmpBinary)) {
      fs.copyFileSync(SOURCE_BINARY, tmpBinary);
    }
    fs.chmodSync(tmpBinary, 0o755);
    return tmpBinary;
  } catch (err) {
    console.error("Could not prepare minesweeper binary in /tmp:", err);
    return SOURCE_BINARY;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

function encodeState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64");
}

function decodeState(raw) {
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function setStateCookie(res, state) {
  res.cookie(COOKIE_NAME, encodeState(state), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 60 * 1000, // 30 minutes
  });
}

function parseEngineOutput(stdout) {
  const data = {};
  stdout
    .trim()
    .split("\n")
    .forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      data[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    });
  return data;
}

app.post("/new-game", (req, res) => {
  execFile(resolveBinaryPath(), ["start"], (err, stdout, stderr) => {
    if (err) {
      console.error("minesweeper start failed:", stderr || err.message);
      return res.status(500).json({ error: "game engine failed to run" });
    }

    const data = parseEngineOutput(stdout);
    if (!data.board || !data.display) {
      return res.status(500).json({ error: "unexpected output from game engine" });
    }

    setStateCookie(res, { board: data.board, display: data.display, status: data.status });

    res.json({ display: data.display, revealed: Number(data.revealed), status: data.status });
  });
});

app.post("/reveal", (req, res) => {
  const cookies = parseCookies(req);
  const state = cookies[COOKIE_NAME] && decodeState(cookies[COOKIE_NAME]);

  if (!state) {
    return res.status(400).json({ error: "no active game — start a new one" });
  }

  // The C engine only judges a single click in isolation, so once the
  // game has already ended, the server itself must refuse further
  // reveals instead of asking the engine again (which would happily
  // report "repeat"/"playing" for a click on an already-revealed cell,
  // even though the match is over).
  if (state.status && state.status !== "playing") {
    return res.status(400).json({ error: "game already over — start a new game" });
  }

  const row = Number(req.body && req.body.row);
  const col = Number(req.body && req.body.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return res.status(400).json({ error: "row and col must be integers" });
  }

  const args = ["reveal", state.board, state.display, String(row), String(col)];

  execFile(resolveBinaryPath(), args, (err, stdout, stderr) => {
    if (err) {
      console.error("minesweeper reveal failed:", stderr || err.message);
      return res.status(500).json({ error: "game engine failed to run" });
    }

    const data = parseEngineOutput(stdout);
    if (!data.display || !data.result || !data.status) {
      return res.status(500).json({ error: "unexpected output from game engine" });
    }

    setStateCookie(res, { board: state.board, display: data.display, status: data.status });

    res.json({
      display: data.display,
      revealed: Number(data.revealed),
      result: data.result, // "safe" | "mine" | "repeat" | "invalid"
      status: data.status, // "playing" | "won" | "lost"
    });
  });
});

module.exports = app;

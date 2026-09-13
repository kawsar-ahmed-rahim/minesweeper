# 💣 Minesweeper — Web Edition

A browser version of a classic terminal Minesweeper game — the original **C** game logic still runs for real on every click, wired up to a **Node.js/Express** backend and a **vanilla HTML/CSS/JS** frontend (kept as separate files) so it can be played (and deployed) from a browser.

---

## 🚀 Features

* 🖱️ Click any cell on a 5x5 grid to reveal it
* 🧠 Real C program places the mines and counts neighbors — not reimplemented in JavaScript
* 🔒 Mine positions kept server-side in an httpOnly cookie, invisible to page JavaScript
* 🔢 Classic color-coded neighbor-count numbers
* 💥 All mines revealed on the grid when you hit one, for a clear game-over view
* 📊 Live "revealed / safe cells" counter
* ⚠️ Feedback for repeat clicks, invalid input, and games that have already ended
* 🏆 Win banner once every safe cell is cleared
* 📱 Responsive layout, keyboard-focus visible
* ☁️ Deployable to Vercel as a serverless function

---

## 🛠️ Built With

* C (original game logic)
* Node.js + Express (backend, spawns the compiled C binary per action)
* HTML5 / CSS3 / JavaScript (ES6) — separate files, no framework or build step
* Vercel (deployment target)

---

## 📂 Project Structure

```text
minesweeper-web/
│
├── api/
│   └── index.js         # Vercel serverless function entry point
│
├── lib/
│   └── app.js             # Shared Express app (used locally and on Vercel)
│
├── public/
│   ├── index.html          # Markup only
│   ├── style.css            # All styling
│   └── script.js             # All game-flow logic
│
├── minesweeper.c             # Original game logic, split into "start" and "reveal" commands
├── server.js                  # Local dev server (`npm start`)
├── package.json
├── vercel.json                  # Vercel build/routing config
└── README.md
```

---

## ⚙️ How It Works

1. On page load, the frontend requests a new game (`POST /new-game`).
2. The server runs the C program in `start` mode, which randomly places 5 mines on a 5x5 board. The server stores the secret board (and the current game status) in an httpOnly cookie — never sent to the page's JavaScript.
3. Player clicks a grid cell.
4. The frontend sends that row/column (`POST /reveal`).
5. The server checks the game hasn't already ended, reads the secret board back out of the cookie, and runs the C program in `reveal` mode with the board, the current display grid, and the clicked coordinates.
6. The C program applies the original checks — bounds check, already-revealed check, mine check, then the exact same neighbor-counting scan as the original `countMines()` — and reports the updated display grid, revealed count, and result.
7. The browser shows the revealed number (or a blank for zero neighboring mines) and updates the counter. Clearing every safe cell wins; clicking a mine reveals all mines and ends the game.

---

## 💡 Challenges Faced

The original program looped through one long-running process: place the mines once, then keep reading coordinates with `scanf()` until a mine was hit or the board was cleared. A web request/response model can't hold that kind of long-running state — each request is independent and stateless.

### Solution

* Split the C program into two commands: `start` (place the mines) and `reveal` (check one cell) — so it stays a simple, stateless "referee" that answers one question per run, the same pattern used for the other three games.
* Since the C program remembers nothing between runs, the *server* keeps the secret board and current status in an httpOnly cookie tied to the browser session, passing the board back into the C program on every click.
* A real bug turned up during testing: because each `reveal` call is judged in isolation, clicking an already-revealed cell *after* the game had already ended would get re-evaluated fresh and incorrectly report `"status": "playing"` again. Fixed by having the server itself remember whether the game already ended and reject further reveals once it has, instead of asking the (stateless) C engine to re-decide something it has no memory of.
* On Vercel specifically, the filesystem is read-only and bundled binaries can lose their executable permission — solved the same way as the other projects: copy the compiled binary into `/tmp` and re-mark it executable at runtime before each cold start.

---

## 📚 What I Learned

* Managing state across multiple stateless requests using cookies, including *game-over* state — not just game data
* Encoding a 2D grid as a flat string to pass between processes
* Spawning and communicating with a compiled C program from Node.js (`child_process.execFile`)
* Designing a small text-based protocol between two programs (parsing plain stdout into JSON)
* A subtle class of bug where a stateless engine can't tell "this move is invalid" from "this game already ended" — and why that check has to live at the layer that actually remembers state
* Constraints of serverless deployment (read-only filesystems, cold starts, bundling native binaries)

---

## 🔮 Future Improvements

* 🚩 Flagging suspected mine cells
* 🗂️ Replace the cookie with a real server-side session store for full secrecy
* 📏 Configurable grid size and mine count / difficulty levels
* ⏱️ Timer and best-time tracking with Local Storage
* 🔊 Sound effects on reveal/mine
* 🌐 WebAssembly version that runs the C code directly in-browser, no backend needed

---

## 🔗 Live Demo

👉 **Live Website:** _add your Vercel URL here after deploying_

---

## 👨‍💻 Author

**Rahim**

If you found this project helpful or interesting, feel free to ⭐ the repository and share your feedback. Contributions, suggestions, and improvements are always welcome!

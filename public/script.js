const SIZE = 5;
const MINES = 5;
const SAFE_CELLS = SIZE * SIZE - MINES;

const gridEl = document.getElementById('grid');
const revealedCountEl = document.getElementById('revealed-count');
const statusEl = document.getElementById('status');
const finalBanner = document.getElementById('final-banner');
const finalTitle = document.getElementById('final-title');
const finalSub = document.getElementById('final-sub');
const resetBtn = document.getElementById('reset');

let gameActive = false;
let cells = [];

function buildGrid() {
  gridEl.innerHTML = '';
  cells = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
    btn.addEventListener('click', () => reveal(row, col, btn));
    gridEl.appendChild(btn);
    cells.push(btn);
  }
}

function renderDisplay(display) {
  display.split('').forEach((mark, i) => {
    const cell = cells[i];
    cell.classList.remove('n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'revealed', 'mine');

    if (mark === '-') {
      cell.textContent = '';
      cell.disabled = false;
      return;
    }

    cell.disabled = true;

    if (mark === '*') {
      cell.textContent = '✕';
      cell.classList.add('mine');
    } else if (mark === '0') {
      cell.textContent = '';
      cell.classList.add('revealed');
    } else {
      cell.textContent = mark;
      cell.classList.add('revealed', 'n' + mark);
    }
  });
}

function updateRevealed(revealed) {
  revealedCountEl.innerHTML = revealed + '<span class="hud-total">/' + SAFE_CELLS + '</span>';
}

function disableAllCells() {
  cells.forEach((c) => (c.disabled = true));
}

async function newGame() {
  statusEl.textContent = 'Loading grid…';
  statusEl.className = 'status';
  finalBanner.hidden = true;
  buildGrid();

  try {
    const res = await fetch('/new-game', { method: 'POST' });
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    renderDisplay(data.display);
    updateRevealed(data.revealed);
    gameActive = true;
    statusEl.textContent = 'Pick a cell to reveal';
    statusEl.className = 'status';
  } catch (err) {
    statusEl.textContent = 'Could not start a new game — try again';
    statusEl.className = 'status mine';
  }
}

async function reveal(row, col, btn) {
  if (!gameActive || btn.disabled) return;

  try {
    const res = await fetch('/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, col })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      statusEl.textContent = errData.error || 'Something went wrong';
      statusEl.className = 'status warn';
      return;
    }

    const data = await res.json();
    renderDisplay(data.display);
    updateRevealed(data.revealed);

    if (data.result === 'safe') {
      statusEl.textContent = 'Clear.';
      statusEl.className = 'status';
    } else if (data.result === 'mine') {
      statusEl.textContent = 'BOOM! You hit a mine.';
      statusEl.className = 'status mine';
    } else if (data.result === 'repeat') {
      statusEl.textContent = 'Already revealed.';
      statusEl.className = 'status warn';
    }

    if (data.status === 'won') {
      gameActive = false;
      disableAllCells();
      finalBanner.hidden = false;
      finalTitle.textContent = 'Congratulations! You cleared the board!';
      finalTitle.className = 'final-title won';
      finalSub.textContent = `All ${SAFE_CELLS} safe cells revealed.`;
    } else if (data.status === 'lost') {
      gameActive = false;
      disableAllCells();
      finalBanner.hidden = false;
      finalTitle.textContent = 'Game Over!';
      finalTitle.className = 'final-title lost';
      finalSub.textContent = 'That cell was a mine.';
    }
  } catch (err) {
    statusEl.textContent = 'Something went wrong — try again';
    statusEl.className = 'status warn';
  }
}

resetBtn.addEventListener('click', newGame);

newGame();

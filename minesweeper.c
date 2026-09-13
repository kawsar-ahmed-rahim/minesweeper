/*
 * minesweeper.c — Minesweeper game logic
 *
 * This is Rahim's original game logic (same 5x5 grid, same 5 randomly
 * placed mines, same neighbor-counting rule), split into two commands
 * instead of one interactive loop, because the server spawns this
 * program fresh for every request rather than keeping one long-running
 * process:
 *
 *   ./minesweeper start
 *       Places 5 mines randomly and prints the secret board plus a
 *       fresh, all-hidden display grid.
 *
 *   ./minesweeper reveal <board25> <display25> <row> <col>
 *       Reveals one cell using the given state and prints the updated
 *       display, revealed count, and result.
 *
 * The secret board only ever lives on the server side (see server.js) —
 * this program just answers "given this board and this cell, what
 * happens next", the same way the original loop body did. Both grids
 * are passed around as flat 25-character strings (row-major, 5x5).
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define SIZE 5
#define MINES 5
#define CELLS (SIZE * SIZE)

/* Places MINES mines randomly on a blank board — same method as the
   original: pick a random cell, skip it if it's already a mine. */
void place_mines(char *board) {
    for (int i = 0; i < CELLS; i++) board[i] = '0';

    srand((unsigned int)time(NULL) ^ (unsigned int)getpid());
    int count = 0;
    while (count < MINES) {
        int idx = rand() % CELLS;
        if (board[idx] != '*') {
            board[idx] = '*';
            count++;
        }
    }
}

/* Exact same neighbor-scan as the original countMines(), just indexing
   into a flat array instead of a 2D array. */
int count_mines(const char *board, int r, int c) {
    int cnt = 0;
    for (int i = r - 1; i <= r + 1; i++)
        for (int j = c - 1; j <= c + 1; j++)
            if (i >= 0 && i < SIZE && j >= 0 && j < SIZE)
                if (board[i * SIZE + j] == '*') cnt++;
    return cnt;
}

void cmd_start(void) {
    char board[CELLS + 1];
    place_mines(board);
    board[CELLS] = '\0';

    char display[CELLS + 1];
    for (int i = 0; i < CELLS; i++) display[i] = '-';
    display[CELLS] = '\0';

    printf("BOARD:%s\n", board);
    printf("DISPLAY:%s\n", display);
    printf("REVEALED:0\n");
    printf("STATUS:playing\n");
}

/* Applies one reveal using the exact same checks as the original loop:
   bounds check, then mine-check, then the neighbor-count reveal. */
void cmd_reveal(const char *boardIn, const char *displayIn, int r, int c) {
    char board[CELLS + 1];
    char display[CELLS + 1];
    strncpy(board, boardIn, CELLS);
    board[CELLS] = '\0';
    strncpy(display, displayIn, CELLS);
    display[CELLS] = '\0';

    const char *result;
    const char *status = "playing";

    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
        result = "invalid";
    } else {
        int idx = r * SIZE + c;
        if (display[idx] != '-') {
            result = "repeat";
        } else if (board[idx] == '*') {
            result = "mine";
            status = "lost";
            /* Reveal every mine on the board, same as a typical
               Minesweeper game-over screen (the original terminal
               version just printed "Game Over" without this, but this
               is a natural, faithful extension for a visual grid). */
            for (int i = 0; i < CELLS; i++) {
                if (board[i] == '*') display[i] = '*';
            }
        } else {
            int mines = count_mines(board, r, c);
            display[idx] = (char)('0' + mines);
            result = "safe";
        }
    }

    int revealed = 0;
    for (int i = 0; i < CELLS; i++) {
        if (display[i] != '-' && display[i] != '*') revealed++;
    }

    if (strcmp(result, "safe") == 0 && revealed == CELLS - MINES) {
        status = "won";
    }

    printf("BOARD:%s\n", board);
    printf("DISPLAY:%s\n", display);
    printf("REVEALED:%d\n", revealed);
    printf("RESULT:%s\n", result);
    printf("STATUS:%s\n", status);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage:\n  %s start\n  %s reveal <board25> <display25> <row> <col>\n",
                argv[0], argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "start") == 0) {
        cmd_start();
        return 0;
    }

    if (strcmp(argv[1], "reveal") == 0) {
        if (argc != 6) {
            fprintf(stderr, "Usage: %s reveal <board25> <display25> <row> <col>\n", argv[0]);
            return 1;
        }
        const char *board = argv[2];
        const char *display = argv[3];
        int r = atoi(argv[4]);
        int c = atoi(argv[5]);
        cmd_reveal(board, display, r, c);
        return 0;
    }

    fprintf(stderr, "Unknown command: %s\n", argv[1]);
    return 1;
}

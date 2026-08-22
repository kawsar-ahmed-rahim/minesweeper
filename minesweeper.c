#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define SIZE 5
#define MINES 5

char board[SIZE][SIZE];      // actual board with mines
char display[SIZE][SIZE];    // what the player sees

void initBoard() {
    for (int i = 0; i < SIZE; i++)
        for (int j = 0; j < SIZE; j++) {
            board[i][j] = '0';
            display[i][j] = '-';
        }
}

void placeMines() {
    int count = 0;
    srand(time(0));
    while (count < MINES) {
        int r = rand() % SIZE;
        int c = rand() % SIZE;
        if (board[r][c] != '*') {
            board[r][c] = '*';
            count++;
        }
    }
}

int countMines(int r, int c) {
    int cnt = 0;
    for (int i = r - 1; i <= r + 1; i++)
        for (int j = c - 1; j <= c + 1; j++)
            if (i >= 0 && i < SIZE && j >= 0 && j < SIZE)
                if (board[i][j] == '*') cnt++;
    return cnt;
}

void printDisplay() {
    printf("\n  ");
    for (int j = 0; j < SIZE; j++) printf("%d ", j);
    printf("\n");
    for (int i = 0; i < SIZE; i++) {
        printf("%d ", i);
        for (int j = 0; j < SIZE; j++)
            printf("%c ", display[i][j]);
        printf("\n");
    }
}

int main() {
    int r, c, revealed = 0;
    initBoard();
    placeMines();

    printf("=== MINESWEEPER ===\n");

    while (1) {
        printDisplay();
        printf("\nEnter row and column to reveal: ");
        scanf("%d %d", &r, &c);

        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
            printf("Invalid position!\n");
            continue;
        }

        if (board[r][c] == '*') {
            printf("\nBOOM! You hit a mine. Game Over!\n");
            break;
        }

        int mines = countMines(r, c);
        display[r][c] = '0' + mines;
        revealed++;

        if (revealed == SIZE * SIZE - MINES) {
            printf("\nCongratulations! You cleared the board!\n");
            break;
        }
    }

    return 0;
}

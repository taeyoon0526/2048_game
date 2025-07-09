class Game2048 {
  constructor() {
    this.grid = [];
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
    this.moveCount = 0;
    this.size = 4;
    this.won = false;
    this.over = false;
    this.tileIdCounter = 0;
    this.gameHistory = [];
    this.startTime = null;

    this.gridContainer = document.getElementById("grid-container");
    this.tileContainer = document.getElementById("tile-container");
    this.scoreContainer = document.getElementById("score");
    this.bestScoreContainer = document.getElementById("best-score");
    this.moveCountContainer = document.getElementById("move-count");
    this.messageContainer = document.getElementById("game-message");
    this.restartButton = document.getElementById("restart-button");
    this.undoButton = document.getElementById("undo-button");

    this.setupGrid();
    this.setupEventListeners();
    this.restart();
  }

  setupGrid() {
    for (let row = 0; row < this.size; row++) {
      const gridRow = document.createElement("div");
      gridRow.classList.add("grid-row");

      for (let col = 0; col < this.size; col++) {
        const gridCell = document.createElement("div");
        gridCell.classList.add("grid-cell");
        gridRow.appendChild(gridCell);
      }

      this.gridContainer.appendChild(gridRow);
    }
  }

  setupEventListeners() {
    this.restartButton.addEventListener("click", () => this.restart());
    this.undoButton.addEventListener("click", () => this.undo());

    document.addEventListener("keydown", (event) => {
      if (this.over || this.won) return;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          this.move("up");
          break;
        case "ArrowDown":
          event.preventDefault();
          this.move("down");
          break;
        case "ArrowLeft":
          event.preventDefault();
          this.move("left");
          break;
        case "ArrowRight":
          event.preventDefault();
          this.move("right");
          break;
        case "z":
        case "Z":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.undo();
          }
          break;
        case "n":
        case "N":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.restart();
          }
          break;
      }
    });

    // 터치 이벤트 (모바일)
    let startX, startY;

    document.addEventListener("touchstart", (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    });

    document.addEventListener("touchend", (event) => {
      if (!startX || !startY) return;

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;

      const diffX = endX - startX;
      const diffY = endY - startY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50) {
          this.move("right");
        } else if (diffX < -50) {
          this.move("left");
        }
      } else {
        if (diffY > 50) {
          this.move("down");
        } else if (diffY < -50) {
          this.move("up");
        }
      }

      startX = null;
      startY = null;
    });
  }

  restart() {
    this.grid = [];
    this.score = 0;
    this.moveCount = 0;
    this.won = false;
    this.over = false;
    this.tileIdCounter = 0;
    this.gameHistory = [];
    this.startTime = Date.now();

    // 그리드 초기화
    for (let row = 0; row < this.size; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.size; col++) {
        this.grid[row][col] = null;
      }
    }

    // 타일 컨테이너 비우기
    this.tileContainer.innerHTML = "";

    // 게임 메시지 숨기기
    this.messageContainer.style.display = "none";
    document.body.classList.remove("game-won", "game-over");

    // 초기 타일 2개 추가
    this.addRandomTile();
    this.addRandomTile();

    this.updateDisplay();
    this.updateUndoButton();
  }

  addRandomTile() {
    const emptyCells = [];

    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell =
        emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;

      const tile = {
        id: this.tileIdCounter++,
        value: value,
        row: randomCell.row,
        col: randomCell.col,
        isNew: true,
        isMerged: false,
      };

      this.grid[randomCell.row][randomCell.col] = tile;
      return true;
    }

    return false;
  }

  move(direction) {
    if (this.over || this.won) return;

    // 게임 상태 저장
    this.saveGameState();

    let moved = false;
    const newGrid = [];

    // 그리드 복사
    for (let row = 0; row < this.size; row++) {
      newGrid[row] = [];
      for (let col = 0; col < this.size; col++) {
        newGrid[row][col] = null;
      }
    }

    // 모든 타일의 merged 상태 초기화
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col]) {
          this.grid[row][col].isMerged = false;
          this.grid[row][col].isNew = false;
        }
      }
    }

    switch (direction) {
      case "left":
        moved = this.moveLeft(newGrid);
        break;
      case "right":
        moved = this.moveRight(newGrid);
        break;
      case "up":
        moved = this.moveUp(newGrid);
        break;
      case "down":
        moved = this.moveDown(newGrid);
        break;
    }

    if (moved) {
      this.grid = newGrid;
      this.moveCount++;
      this.addRandomTile();
      this.updateDisplay();
      this.updateUndoButton();

      // 사운드 효과
      this.playMoveSound();

      setTimeout(() => {
        if (this.isGameWon()) {
          this.won = true;
          this.showMessage("축하합니다! 2048을 달성했습니다!", "game-won");
          // 승리 사운드
          this.playWinSound();
        } else if (this.isGameOver()) {
          this.over = true;
          this.showMessage("게임 오버!", "game-over");
          // 게임 오버 사운드
          this.playGameOverSound();
        }
      }, 200);
    } else {
      // 이동하지 않았으면 히스토리 제거
      this.gameHistory.pop();
    }
  }

  moveLeft(newGrid) {
    let moved = false;

    for (let row = 0; row < this.size; row++) {
      const tiles = [];

      // 빈 칸이 아닌 타일들만 수집
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col]) {
          tiles.push(this.grid[row][col]);
        }
      }

      // 타일들을 왼쪽으로 이동하고 합치기
      let targetCol = 0;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const originalCol = tile.col;

        if (
          i < tiles.length - 1 &&
          tiles[i + 1] &&
          tile.value === tiles[i + 1].value &&
          !tile.isMerged &&
          !tiles[i + 1].isMerged
        ) {
          // 타일 합치기
          const mergedTile = {
            id: this.tileIdCounter++,
            value: tile.value * 2,
            row: row,
            col: targetCol,
            isNew: false,
            isMerged: true,
          };

          newGrid[row][targetCol] = mergedTile;
          this.score += mergedTile.value;
          i++; // 다음 타일 건너뛰기

          // 사운드 효과
          this.playMergeSound(mergedTile.value);
        } else {
          // 타일 이동
          tile.row = row;
          tile.col = targetCol;
          newGrid[row][targetCol] = tile;
        }

        if (originalCol !== targetCol) {
          moved = true;
        }

        targetCol++;
      }
    }

    return moved;
  }

  moveRight(newGrid) {
    let moved = false;

    for (let row = 0; row < this.size; row++) {
      const tiles = [];

      // 빈 칸이 아닌 타일들만 수집 (오른쪽부터)
      for (let col = this.size - 1; col >= 0; col--) {
        if (this.grid[row][col]) {
          tiles.push(this.grid[row][col]);
        }
      }

      // 타일들을 오른쪽으로 이동하고 합치기
      let targetCol = this.size - 1;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const originalCol = tile.col;

        if (
          i < tiles.length - 1 &&
          tiles[i + 1] &&
          tile.value === tiles[i + 1].value &&
          !tile.isMerged &&
          !tiles[i + 1].isMerged
        ) {
          // 타일 합치기
          const mergedTile = {
            id: this.tileIdCounter++,
            value: tile.value * 2,
            row: row,
            col: targetCol,
            isNew: false,
            isMerged: true,
          };

          newGrid[row][targetCol] = mergedTile;
          this.score += mergedTile.value;
          i++; // 다음 타일 건너뛰기

          // 사운드 효과
          this.playMergeSound(mergedTile.value);
        } else {
          // 타일 이동
          tile.row = row;
          tile.col = targetCol;
          newGrid[row][targetCol] = tile;
        }

        if (originalCol !== targetCol) {
          moved = true;
        }

        targetCol--;
      }
    }

    return moved;
  }

  moveUp(newGrid) {
    let moved = false;

    for (let col = 0; col < this.size; col++) {
      const tiles = [];

      // 빈 칸이 아닌 타일들만 수집
      for (let row = 0; row < this.size; row++) {
        if (this.grid[row][col]) {
          tiles.push(this.grid[row][col]);
        }
      }

      // 타일들을 위로 이동하고 합치기
      let targetRow = 0;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const originalRow = tile.row;

        if (
          i < tiles.length - 1 &&
          tiles[i + 1] &&
          tile.value === tiles[i + 1].value &&
          !tile.isMerged &&
          !tiles[i + 1].isMerged
        ) {
          // 타일 합치기
          const mergedTile = {
            id: this.tileIdCounter++,
            value: tile.value * 2,
            row: targetRow,
            col: col,
            isNew: false,
            isMerged: true,
          };

          newGrid[targetRow][col] = mergedTile;
          this.score += mergedTile.value;
          i++; // 다음 타일 건너뛰기

          // 사운드 효과
          this.playMergeSound(mergedTile.value);
        } else {
          // 타일 이동
          tile.row = targetRow;
          tile.col = col;
          newGrid[targetRow][col] = tile;
        }

        if (originalRow !== targetRow) {
          moved = true;
        }

        targetRow++;
      }
    }

    return moved;
  }

  moveDown(newGrid) {
    let moved = false;

    for (let col = 0; col < this.size; col++) {
      const tiles = [];

      // 빈 칸이 아닌 타일들만 수집 (아래쪽부터)
      for (let row = this.size - 1; row >= 0; row--) {
        if (this.grid[row][col]) {
          tiles.push(this.grid[row][col]);
        }
      }

      // 타일들을 아래로 이동하고 합치기
      let targetRow = this.size - 1;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const originalRow = tile.row;

        if (
          i < tiles.length - 1 &&
          tiles[i + 1] &&
          tile.value === tiles[i + 1].value &&
          !tile.isMerged &&
          !tiles[i + 1].isMerged
        ) {
          // 타일 합치기
          const mergedTile = {
            id: this.tileIdCounter++,
            value: tile.value * 2,
            row: targetRow,
            col: col,
            isNew: false,
            isMerged: true,
          };

          newGrid[targetRow][col] = mergedTile;
          this.score += mergedTile.value;
          i++; // 다음 타일 건너뛰기

          // 사운드 효과
          this.playMergeSound(mergedTile.value);
        } else {
          // 타일 이동
          tile.row = targetRow;
          tile.col = col;
          newGrid[targetRow][col] = tile;
        }

        if (originalRow !== targetRow) {
          moved = true;
        }

        targetRow--;
      }
    }

    return moved;
  }

  updateDisplay() {
    // 기존 타일들 제거
    this.tileContainer.innerHTML = "";

    // 새 타일들 생성
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col]) {
          this.createTile(this.grid[row][col]);
        }
      }
    }

    // 점수 업데이트
    this.scoreContainer.textContent = this.score;

    // 이동 횟수 업데이트
    this.moveCountContainer.textContent = this.moveCount;

    // 최고 점수 업데이트
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem("bestScore", this.bestScore.toString());
    }
    this.bestScoreContainer.textContent = this.bestScore;
  }

  createTile(tile) {
    const tileElement = document.createElement("div");
    tileElement.classList.add(
      "tile",
      `tile-${tile.value}`,
      `tile-position-${tile.row}-${tile.col}`
    );

    if (tile.value > 2048) {
      tileElement.classList.add("tile-super");
    }

    if (tile.isNew) {
      tileElement.classList.add("tile-new");
    }

    if (tile.isMerged) {
      tileElement.classList.add("tile-merged");
    }

    tileElement.textContent = tile.value;
    this.tileContainer.appendChild(tileElement);
  }

  isGameWon() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] && this.grid[row][col].value === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  isGameOver() {
    // 빈 칸이 있는지 확인
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] === null) {
          return false;
        }
      }
    }

    // 인접한 타일이 합쳐질 수 있는지 확인
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const current = this.grid[row][col];

        if (
          col < this.size - 1 &&
          current.value === this.grid[row][col + 1].value
        ) {
          return false;
        }

        if (
          row < this.size - 1 &&
          current.value === this.grid[row + 1][col].value
        ) {
          return false;
        }
      }
    }

    return true;
  }

  showMessage(message, className) {
    const gameTime = this.startTime
      ? Math.floor((Date.now() - this.startTime) / 1000)
      : 0;
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;

    this.messageContainer.querySelector("p").textContent = message;

    // 게임 통계 추가
    const statsElement = document.getElementById("game-stats");
    statsElement.innerHTML = `
      <div>최종 점수: <strong>${this.score}</strong></div>
      <div>이동 횟수: <strong>${this.moveCount}</strong></div>
      <div>플레이 시간: <strong>${minutes}분 ${seconds}초</strong></div>
      ${
        this.score > 0
          ? `<div>평균 점수/이동: <strong>${Math.floor(
              this.score / Math.max(this.moveCount, 1)
            )}</strong></div>`
          : ""
      }
    `;

    this.messageContainer.style.display = "block";
    document.body.classList.add(className);

    // 메시지 내 다시 시도 버튼
    const messageRestartButton =
      this.messageContainer.querySelector(".restart-button");
    messageRestartButton.addEventListener("click", () => this.restart());
  }

  saveGameState() {
    const gridCopy = this.grid.map((row) =>
      row.map((tile) => (tile ? { ...tile } : null))
    );

    this.gameHistory.push({
      grid: gridCopy,
      score: this.score,
      moveCount: this.moveCount,
    });

    // 최대 10개의 히스토리만 유지
    if (this.gameHistory.length > 10) {
      this.gameHistory.shift();
    }
  }

  undo() {
    if (this.gameHistory.length === 0 || this.over || this.won) return;

    const previousState = this.gameHistory.pop();
    this.grid = previousState.grid;
    this.score = previousState.score;
    this.moveCount = previousState.moveCount;

    this.updateDisplay();
    this.updateUndoButton();
  }

  updateUndoButton() {
    if (this.gameHistory.length > 0 && !this.over && !this.won) {
      this.undoButton.classList.add("enabled");
    } else {
      this.undoButton.classList.remove("enabled");
    }
  }

  showScoreAnimation(points, tile) {
    const scoreElement = document.createElement("div");
    scoreElement.classList.add("score-animation");
    scoreElement.textContent = "+" + points;

    // 타일 위치에서 시작
    const tileRect = tile.getBoundingClientRect();
    const containerRect = this.tileContainer.getBoundingClientRect();

    scoreElement.style.left = tileRect.left - containerRect.left + 50 + "px";
    scoreElement.style.top = tileRect.top - containerRect.top + "px";

    this.tileContainer.appendChild(scoreElement);

    // 애니메이션 후 제거
    setTimeout(() => {
      if (scoreElement.parentNode) {
        scoreElement.parentNode.removeChild(scoreElement);
      }
    }, 1000);
  }

  // 간단한 사운드 효과
  playSound(frequency, duration, type = "move") {
    if (!window.AudioContext && !window.webkitAudioContext) return;

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  playMoveSound() {
    this.playSound(220, 0.1, "move");
  }

  playMergeSound(value) {
    const frequency = Math.min(440 + Math.log2(value) * 50, 880);
    this.playSound(frequency, 0.2, "merge");
  }

  playWinSound() {
    // 승리 멜로디
    setTimeout(() => this.playSound(523, 0.2), 0);
    setTimeout(() => this.playSound(659, 0.2), 200);
    setTimeout(() => this.playSound(784, 0.4), 400);
  }

  playGameOverSound() {
    // 게임오버 사운드
    this.playSound(200, 0.5);
  }
}

// 게임 시작
document.addEventListener("DOMContentLoaded", () => {
  new Game2048();
});

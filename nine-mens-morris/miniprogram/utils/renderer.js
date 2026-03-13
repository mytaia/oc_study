const PHASE_PLACING = 'placing';
const PHASE_MOVING = 'moving';
const PLAYER_1 = 1;
const PLAYER_2 = 2;
const ADJACENT = [
  [1, 7], [0, 2, 9], [1, 3], [2, 4, 11],
  [3, 5], [4, 6, 13], [5, 7], [6, 0, 15],
  [9, 15], [8, 10, 1, 17], [9, 11], [10, 12, 3, 19],
  [11, 13], [12, 14, 5, 21], [13, 15], [14, 8, 7, 23],
  [17, 23], [16, 18, 9], [17, 19], [18, 20, 11],
  [19, 21], [20, 22, 13], [21, 23], [22, 16, 15]
];

class Renderer {
  constructor(canvas, particleSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particleSystem = particleSystem;

    this.width = 0;
    this.height = 0;
    this.isPortrait = false;
    this.pieceRadius = 18;
    this.boardPoints = [];

    this.hoveredPoint = null;
    this.onPointClick = null;

    this.lastAIMovedPiece = null;
    this.aiRemovePosition = null;
    this.aiMoveFrom = null;
    this.aiMoveTo = null;
    this.currentMillPositions = [];
    this.moveAnimation = null;

    this.colors = {
      player1: '#00f5ff',
      player1Dark: '#00a8b3',
      player2: '#ff00ff',
      player2Dark: '#b300b3',
      boardLine: 'rgba(255,255,255,0.3)',
      validMove: 'rgba(0,255,136,0.45)',
      millLine: '#ffd700'
    };

    this.resize();
  }

  resize() {
    this.calculateBoardPoints();
    this.calculatePieceRadius();
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.isPortrait = height > width;
    this.calculateBoardPoints();
    this.calculatePieceRadius();
  }

  calculatePieceRadius() {
    const minDim = Math.min(this.width || 0, this.height || 0);
    const base = Math.max(12, Math.min(24, minDim * 0.03));
    this.pieceRadius = this.isPortrait && this.width < 400 ? base * 0.9 : base;
  }

  updateColors(theme) {
    const themes = {
      cyberpunk: {
        player1: '#00f5ff', player1Dark: '#00a8b3',
        player2: '#ff00ff', player2Dark: '#b300b3',
        boardLine: 'rgba(255,255,255,0.3)', validMove: 'rgba(0,255,136,0.45)', millLine: '#ffd700'
      },
      blackgold: {
        player1: '#FFD700', player1Dark: '#8B4513',
        player2: '#5D4037', player2Dark: '#3E2723',
        boardLine: 'rgba(212,175,55,0.35)', validMove: 'rgba(197,160,40,0.45)', millLine: '#ffd700'
      },
      blackwhite: {
        player1: '#ffffff', player1Dark: '#cccccc',
        player2: '#2a2a2a', player2Dark: '#0a0a0a',
        boardLine: 'rgba(255,255,255,0.3)', validMove: 'rgba(204,204,204,0.45)', millLine: '#ffd700'
      },
      chinese: {
        player1: '#c41e3a', player1Dark: '#8b0000',
        player2: '#d4a574', player2Dark: '#8b4513',
        boardLine: 'rgba(212,165,116,0.35)', validMove: 'rgba(34,139,34,0.45)', millLine: '#ffd700'
      }
    };

    this.colors = themes[theme] || themes.cyberpunk;
  }

  calculateBoardPoints() {
    if (!this.width || !this.height) {
      this.boardPoints = [];
      return;
    }

    let boardSize;
    let centerX;
    let centerY;

    if (this.isPortrait) {
      const topMargin = this.height * 0.15;
      const bottomMargin = this.height * 0.15;
      const availableHeight = this.height - topMargin - bottomMargin;
      boardSize = Math.min(this.width * 0.75, availableHeight * 0.8);
      centerX = this.width / 2;
      centerY = topMargin + availableHeight / 2;
    } else {
      const minDim = Math.min(this.width, this.height);
      boardSize = minDim * 0.65;
      centerX = this.width / 2;
      centerY = this.height / 2;
    }

    const sizes = [boardSize, boardSize * 0.7, boardSize * 0.4];

    this.boardPoints = [];
    for (let ring = 0; ring < 3; ring++) {
      const half = sizes[ring] / 2;
      const pts = [
        { x: centerX - half, y: centerY - half },
        { x: centerX, y: centerY - half },
        { x: centerX + half, y: centerY - half },
        { x: centerX + half, y: centerY },
        { x: centerX + half, y: centerY + half },
        { x: centerX, y: centerY + half },
        { x: centerX - half, y: centerY + half },
        { x: centerX - half, y: centerY }
      ];
      for (let i = 0; i < 8; i++) {
        this.boardPoints.push({ x: pts[i].x, y: pts[i].y, ring, index: ring * 8 + i });
      }
    }
  }

  setOnPointClick(callback) {
    this.onPointClick = callback;
  }

  getMousePos(e) {
    if (e.x !== undefined && e.y !== undefined) {
      return { x: e.x, y: e.y };
    }
    const rect = this.canvas.getBoundingClientRect
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  handleWxTouch(x, y) {
    const point = this.findNearestPoint(x, y);
    if (point && this.onPointClick) {
      this.onPointClick(point.index);
    }
  }

  findNearestPoint(x, y) {
    const baseThreshold = Math.max(24, Math.min(40, (this.width || 0) * 0.05));
    const threshold = this.isPortrait ? baseThreshold * 1.2 : baseThreshold;

    for (const point of this.boardPoints) {
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) return point;
    }
    return null;
  }

  draw(game) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.updateMoveAnimation();
    this.drawBoard();
    this.drawPieces(game);
    this.drawMovingPiece();
    this.drawHighlights(game);
  }

  drawBoard() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.colors.boardLine;
    ctx.lineWidth = 2;

    for (let ring = 0; ring < 3; ring++) {
      const base = ring * 8;
      const corners = [base + 0, base + 2, base + 4, base + 6];
      if (corners.every(idx => this.boardPoints[idx])) {
        ctx.beginPath();
        ctx.moveTo(this.boardPoints[corners[0]].x, this.boardPoints[corners[0]].y);
        ctx.lineTo(this.boardPoints[corners[1]].x, this.boardPoints[corners[1]].y);
        ctx.lineTo(this.boardPoints[corners[2]].x, this.boardPoints[corners[2]].y);
        ctx.lineTo(this.boardPoints[corners[3]].x, this.boardPoints[corners[3]].y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    const connectors = [
      [1, 9, 17],
      [3, 11, 19],
      [5, 13, 21],
      [7, 15, 23]
    ];
    for (const [a, b, c] of connectors) {
      if (this.boardPoints[a] && this.boardPoints[b] && this.boardPoints[c]) {
        ctx.beginPath();
        ctx.moveTo(this.boardPoints[a].x, this.boardPoints[a].y);
        ctx.lineTo(this.boardPoints[b].x, this.boardPoints[b].y);
        ctx.lineTo(this.boardPoints[c].x, this.boardPoints[c].y);
        ctx.stroke();
      }
    }

    for (const point of this.boardPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.boardLine;
      ctx.fill();
    }
  }

  drawPieces(game) {
    const board = game.getBoard();
    for (let i = 0; i < 24; i++) {
      if (board[i] !== 0 && this.boardPoints[i]) {
        if (
          this.moveAnimation &&
          i === this.moveAnimation.from &&
          board[i] === this.moveAnimation.player
        ) {
          continue;
        }
        const isSelected = game.getSelectedPiece() === i;
        this.drawPiece(this.boardPoints[i].x, this.boardPoints[i].y, board[i], isSelected);
      }
    }
  }

  drawPiece(x, y, player, isSelected) {
    const ctx = this.ctx;
    const color = player === PLAYER_1 ? this.colors.player1 : this.colors.player2;
    const dark = player === PLAYER_1 ? this.colors.player1Dark : this.colors.player2Dark;
    const r = isSelected ? this.pieceRadius * 1.15 : this.pieceRadius;

    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    g.addColorStop(0, '#ffffffaa');
    g.addColorStop(0.2, color + 'ee');
    g.addColorStop(1, dark);

    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}cc`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  drawMovingPiece() {
    if (!this.moveAnimation) return;

    const { from, to, player, progress } = this.moveAnimation;
    const fromPt = this.boardPoints[from];
    const toPt = this.boardPoints[to];
    if (!fromPt || !toPt) return;

    const x = fromPt.x + (toPt.x - fromPt.x) * progress;
    const y = fromPt.y + (toPt.y - fromPt.y) * progress;
    this.drawPiece(x, y, player, false);
  }

  drawHighlights(game) {
    const ctx = this.ctx;

    if (game.getCurrentPhase() === PHASE_PLACING && !game.gameOver) {
      const hotSpots = game.getBlockedPositions ? game.getBlockedPositions() : [];
      for (const idx of hotSpots) {
        const p = this.boardPoints[idx];
        if (!p) continue;
        const pulse = Math.sin(Date.now() / 120) * 0.25 + 0.75;
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.pieceRadius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 140, 70, ${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, this.pieceRadius - 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 140, 70, ${pulse * 0.25})`;
        ctx.fill();
      }
    }

    if (game.state.millFormed && game.state.removePiece) {
      const removable = game.getRemovablePieces(game.state.removePiece);
      for (const idx of removable) {
        const p = this.boardPoints[idx];
        if (!p) continue;
        const pulse = Math.sin(Date.now() / 90) * 0.25 + 0.75;
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.pieceRadius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,60,60,${pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      return;
    }

    if (game.getCurrentPhase() === PHASE_MOVING) {
      const selected = game.getSelectedPiece();
      if (selected !== null) {
        for (const to of ADJACENT[selected]) {
          if (game.state.board[to] !== 0 || !this.boardPoints[to]) continue;
          const p = this.boardPoints[to];
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = this.colors.validMove;
          ctx.fill();
        }
      }
    }

    if (this.aiMoveFrom !== null && this.aiMoveTo !== null) {
      const fromPt = this.boardPoints[this.aiMoveFrom];
      const toPt = this.boardPoints[this.aiMoveTo];
      if (fromPt && toPt) {
        const pulse = Math.sin(Date.now() / 100) * 0.25 + 0.75;
        ctx.beginPath();
        ctx.moveTo(fromPt.x, fromPt.y);
        ctx.lineTo(toPt.x, toPt.y);
        ctx.strokeStyle = `rgba(255, 0, 255, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (this.lastAIMovedPiece !== null && this.boardPoints[this.lastAIMovedPiece]) {
      const p = this.boardPoints[this.lastAIMovedPiece];
      const pulse = Math.sin(Date.now() / 80) * 0.2 + 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.pieceRadius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 255, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (this.currentMillPositions.length > 0) {
      ctx.strokeStyle = this.colors.millLine;
      ctx.lineWidth = 3;
      for (const line of this.currentMillPositions) {
        const pts = line.map(i => this.boardPoints[i]).filter(Boolean);
        if (pts.length !== 3) continue;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.stroke();
      }
    }
  }

  startMoveAnimation(from, to, player, duration = 320) {
    this.moveAnimation = {
      from,
      to,
      player,
      startTime: Date.now(),
      duration,
      progress: 0
    };
  }

  updateMoveAnimation() {
    if (!this.moveAnimation) return;
    const elapsed = Date.now() - this.moveAnimation.startTime;
    const progress = Math.min(1, elapsed / this.moveAnimation.duration);
    this.moveAnimation.progress = progress;
    if (progress >= 1) {
      this.moveAnimation = null;
    }
  }

  hasMoveAnimation() {
    return this.moveAnimation !== null;
  }

  setLastAIMovedPiece(position) { this.lastAIMovedPiece = position; }
  clearLastAIMovedPiece() { this.lastAIMovedPiece = null; }
  setAIRemovePosition(position) { this.aiRemovePosition = position; }
  clearAIRemovePosition() { this.aiRemovePosition = null; }
  setAIMovePositions(from, to) { this.aiMoveFrom = from; this.aiMoveTo = to; }
  clearAIMovePositions() { this.aiMoveFrom = null; this.aiMoveTo = null; }
  setCurrentMills(positions) { this.currentMillPositions = positions || []; }
  clearCurrentMills() { this.currentMillPositions = []; }

  addPlaceAnimation() {}
  addRemoveAnimation() {}
  addMillAnimation() {}
  updateAnimations() {}
}

module.exports = Renderer;

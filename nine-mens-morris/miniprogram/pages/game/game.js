// pages/game/game.js
const { Game, PHASE_PLACING } = require('../../utils/game.js');
const AI = require('../../utils/ai.js');

// 甯搁噺
const PLAYER_1 = 1;
const PLAYER_2 = 2;

Page({
  data: {
    icons: {
      newGame: '↻',
      theme: '✦',
      undo: '↶',
      start: '▶',
      restart: '⟲'
    },
    currentPlayer: 1,
    p1ToPlace: 9,
    p2ToPlace: 9,
    p1OnBoard: 0,
    p2OnBoard: 0,
    phaseText: '放置阶段',
    turnText: '请落子',
    
    showFirsthandMenu: true,
    showThemeMenu: false,
    showWinner: false,
    showLoading: false,
    showHint: true,
    
    difficulty: 'hard',
    firsthand: 'player',
    theme: 'cyberpunk',
    
    winnerTitle: '',
    winnerSubtitle: ''
  },

  onLoad() {
    console.log('Game page loaded');
    try {
      this.timeoutIds = new Set();
      this.intervalIds = new Set();
      const savedTheme = wx.getStorageSync('gameTheme');
      if (savedTheme) {
        this.setData({ theme: savedTheme });
      }
      this.initGame();
    } catch (e) {
      console.error('Init game error:', e);
    }
  },

  onReady() {
    console.log('Game page ready');
    this.initCanvas();
  },

  onUnload() {
    this.clearAsyncTasks();
  },

  initGame() {
    this.game = new Game();
    this.ai = new AI(this.data.difficulty);
    this.isPlayerTurn = true;
    this.isProcessing = false;
  },

  scheduleTimeout(callback, delay) {
    const id = setTimeout(() => {
      this.timeoutIds.delete(id);
      callback();
    }, delay);
    this.timeoutIds.add(id);
    return id;
  },

  scheduleInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervalIds.add(id);
    return id;
  },

  clearAsyncTasks() {
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.intervalIds.forEach((id) => clearInterval(id));
    this.timeoutIds.clear();
    this.intervalIds.clear();
  },

  initCanvas() {
    const that = this;
    
    try {
      const sysInfo = wx.getSystemInfoSync();
      const width = sysInfo.windowWidth;
      const height = sysInfo.windowHeight;
      const dpr = sysInfo.pixelRatio;
      
      console.log('Canvas init:', width, height, dpr);

      // 延迟一点，确保页面节点已准备完成
      that.scheduleTimeout(function() {
        that.initCanvases(width, height, dpr);
      }, 100);
    } catch (e) {
      console.error('Canvas init error:', e);
    }
  },

  initCanvases(width, height, dpr) {
    const that = this;
    
    // 鍒濆鍖栬儗鏅疌anvas
    const bgQuery = wx.createSelectorQuery();
    bgQuery.select('#bg-canvas').fields({ node: true, size: true }).exec(function(res) {
      try {
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);
          
          that.bgCanvas = canvas;
          that.bgCtx = ctx;
          
          that.drawBackground(ctx, width, height);
          console.log('Bg canvas ready');
        }
      } catch (e) {
        console.error('Bg canvas error:', e);
      }
    });
    
    // 初始化游戏 Canvas
    const gameQuery = wx.createSelectorQuery();
    gameQuery.select('#game-canvas').fields({ node: true, size: true }).exec(function(res) {
      try {
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);
          
          that.gameCanvas = canvas;
          that.gameCtx = ctx;
          
          that.initRenderer(width, height);
          console.log('Game canvas ready');
        }
      } catch (e) {
        console.error('Game canvas error:', e);
      }
    });
  },

  // 瑙︽懜浜嬩欢澶勭悊
  onTouchStart(e) {
    if (!this.renderer) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const x = touch.x;
    const y = touch.y;
    
    this.renderer.handleWxTouch(x, y);
  },

  onTouchMove(e) {
    // 可按需添加拖动逻辑
  },

  onTouchEnd(e) {
    // 瑙︽懜缁撴潫
  },

  drawBackground(ctx, width, height) {
    if (!ctx) return;
    try {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0a0a0f');
      gradient.addColorStop(0.5, '#12121a');
      gradient.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } catch (e) {
      console.error('Draw background error:', e);
    }
  },

  initRenderer(width, height) {
    try {
      const Renderer = require('../../utils/renderer.js');
      
      // Renderer 构造函数接收 canvas 和 particleSystem
      this.renderer = new Renderer(this.gameCanvas, null);
      this.renderer.setSize(width, height);
      this.renderer.updateColors(this.data.theme);
      
      this.renderer.setOnPointClick((index) => this.handlePointClick(index));
      
      // 绘制棋盘
      if (this.game) {
        this.renderer.draw(this.game);
      }
      
      console.log('Renderer initialized successfully');
    } catch (e) {
      console.error('Renderer init error:', e);
      // 澶囩敤鏂规锛氱洿鎺ョ粯鍒剁畝鍗曟鐩?      this.drawSimpleBoard(width, height);
    }
  },

  drawSimpleBoard(width, height) {
    if (!this.gameCtx) return;
    try {
      const ctx = this.gameCtx;
      const centerX = width / 2;
      const centerY = height / 2;
      const boardSize = Math.min(width, height) * 0.5;
      
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 3;
      
      // 缁樺埗涓変釜鏂规
      for (let i = 0; i < 3; i++) {
        const half = (boardSize * (1 - i * 0.33)) / 2;
        ctx.strokeRect(centerX - half, centerY - half, half * 2, half * 2);
      }
      
      console.log('Simple board drawn');
    } catch (e) {
      console.error('Draw simple board error:', e);
    }
  },

  handlePointClick(index) {
    console.log('Point clicked:', index);
    if (!this.isPlayerTurn || this.isProcessing || this.game.gameOver) return;

    if (this.game.state.millFormed) {
      this.handleRemovePiece(index);
      return;
    }

    if (this.game.state.phase === PHASE_PLACING) {
      this.handlePlacePiece(index);
    } else {
      this.handleMovePiece(index);
    }
  },

  handlePlacePiece(index) {
    if (this.game.state.board[index] !== 0) return;
    
    const success = this.game.placePiece(index);
    
    if (success) {
      this.updateUI();
      
      if (this.game.state.millFormed) {
        this.setData({ turnText: '选择要移除的棋子' });
        this.scheduleTimeout(() => {
          this.renderer.clearCurrentMills();
        }, 1500);
        return;
      }
      
      this.endPlayerTurn();
    }
  },

  handleMovePiece(index) {
    if (this.game.state.selectedPiece === null) {
      if (this.game.state.board[index] === 1) {
        this.game.selectPiece(index);
        this.updateUI();
      }
      return;
    }

    if (this.game.state.board[index] === 1) {
      this.game.selectPiece(index);
      this.updateUI();
      return;
    }

    if (this.game.state.board[index] === 0) {
      const from = this.game.state.selectedPiece;
      const applyMove = () => this.applyPlayerMove(from, index);

      if (!this.game.isValidMove(from, index)) {
        return;
      }

      if (this.renderer && typeof this.renderer.startMoveAnimation === 'function') {
        this.isProcessing = true;
        this.animateMove(from, index, 1, applyMove, false);
      } else {
        applyMove();
      }
    }
  },

  applyPlayerMove(from, to) {
    const success = this.game.movePiece(from, to);
    this.isProcessing = false;

    if (!success) return;

    this.game.deselectPiece();
    this.updateUI();
    
    if (this.game.state.millFormed) {
      this.setData({ turnText: '选择要移除的棋子' });
      this.scheduleTimeout(() => {
        this.renderer.clearCurrentMills();
      }, 1500);
      return;
    }
    
    this.endPlayerTurn();
  },

  handleRemovePiece(index) {
    const player = this.game.state.removePiece;
    const removable = this.game.getRemovablePieces(player);
    
    if (removable.includes(index)) {
      this.game.removePiece(index);
      this.renderer.clearCurrentMills();
      this.updateUI();
      
      if (this.game.gameOver) {
        this.showWinner();
        return;
      }
      
      this.endPlayerTurn();
    }
  },

  endPlayerTurn() {
    if (this.game.gameOver) {
      this.showWinner();
      return;
    }

    this.isPlayerTurn = false;
    this.isProcessing = true;
    
    this.setData({
      currentPlayer: 2,
      showLoading: true
    });
    
    this.scheduleTimeout(() => {
      this.makeAIMove();
    }, 500);
  },

  makeAIMove() {
    if (this.game.gameOver) {
      this.setData({ showLoading: false });
      this.showWinner();
      return;
    }

    try {
      const move = this.ai.makeMove(this.game);
      
      if (!move) {
        this.game.gameOver = true;
        this.game.winner = 1;
        this.setData({ showLoading: false });
        this.showWinner();
        return;
      }

      this.processAIMove(move);
    } catch (e) {
      console.error('AI move error:', e);
      this.setData({ showLoading: false });
      this.isPlayerTurn = true;
      this.isProcessing = false;
    }
  },

  processAIMove(move) {
    const applyMove = () => {
      if (this.game.state.phase === PHASE_PLACING) {
        this.game.placePiece(move.to);
        if (this.renderer) {
          this.renderer.setLastAIMovedPiece(move.to);
          this.scheduleTimeout(() => {
            if (this.renderer) {
              this.renderer.clearLastAIMovedPiece();
              this.renderer.draw(this.game);
            }
          }, 1200);
        }
      } else {
        this.game.movePiece(move.from, move.to);
        if (this.renderer) {
          this.renderer.setLastAIMovedPiece(move.to);
          this.renderer.clearAIMovePositions();
          this.scheduleTimeout(() => {
            if (this.renderer) {
              this.renderer.clearLastAIMovedPiece();
              this.renderer.draw(this.game);
            }
          }, 1200);
        }
      }

      this.applyAIMoveResult();
    };

    if (this.game.state.phase === PHASE_PLACING) {
      applyMove();
    } else {
      this.animateMove(move.from, move.to, 2, applyMove, true);
    }
  },

  animateMove(from, to, player, onDone, showPath = false) {
    if (!this.renderer || typeof this.renderer.startMoveAnimation !== 'function') {
      onDone();
      return;
    }

    if (showPath) {
      this.renderer.setAIMovePositions(from, to);
    } else {
      this.renderer.clearAIMovePositions();
    }
    this.renderer.startMoveAnimation(from, to, player, 360);

    const timer = this.scheduleInterval(() => {
      if (!this.renderer || !this.game) {
        clearInterval(timer);
        this.intervalIds.delete(timer);
        onDone();
        return;
      }

      this.renderer.draw(this.game);

      if (!this.renderer.hasMoveAnimation()) {
        clearInterval(timer);
        this.intervalIds.delete(timer);
        onDone();
      }
    }, 16);
  },

  applyAIMoveResult() {
    if (this.game.state.millFormed) {
      const removable = this.game.getRemovablePieces(this.game.state.currentPlayer);
      const posToRemove = removable[Math.floor(Math.random() * removable.length)];
      
      this.setData({ 
        showLoading: false,
        turnText: 'AI成三! 准备吃子...'
      });
      
      this.scheduleTimeout(() => {
        this.game.removePiece(posToRemove);
        
        if (this.game.gameOver) {
          this.showWinner();
          return;
        }
        
        this.isPlayerTurn = true;
        this.isProcessing = false;
        
        this.setData({ currentPlayer: 1 });
        this.updateUI();
      }, 1500);
      
      return;
    }

    this.setData({ showLoading: false });
    
    this.isPlayerTurn = true;
    this.isProcessing = false;
    
    this.setData({ currentPlayer: 1 });
    this.updateUI();
  },

  updateUI() {
    const phase = this.game.getCurrentPhase();
    
    const updateData = {
      currentPlayer: this.game.state.currentPlayer,
      phaseText: phase === PHASE_PLACING ? '放置阶段' : '移动阶段'
    };
    
    if (phase === PHASE_PLACING) {
      updateData.p1ToPlace = this.game.getPiecesRemaining(1);
      updateData.p2ToPlace = this.game.getPiecesRemaining(2);
      updateData.p1OnBoard = this.game.getPiecesOnBoard(1);
      updateData.p2OnBoard = this.game.getPiecesOnBoard(2);
    } else {
      updateData.p1ToPlace = '-';
      updateData.p2ToPlace = '-';
      updateData.p1OnBoard = this.game.getPiecesOnBoard(1);
      updateData.p2OnBoard = this.game.getPiecesOnBoard(2);
    }
    
    if (!this.game.state.millFormed) {
      if (this.isPlayerTurn) {
        updateData.turnText = phase === PHASE_PLACING ? '请落子' : '请走子';
      } else {
        updateData.turnText = 'AI思考中...';
      }
    }
    
    this.setData(updateData);
    
    // 重新绘制棋盘
    if (this.renderer && this.game) {
      this.renderer.draw(this.game);
    }
  },

  showWinner() {
    const winner = this.game.winner;
    
    this.setData({
      showWinner: true,
      showLoading: false,
      winnerTitle: winner === 1 ? '胜利!' : '失败',
      winnerSubtitle: winner === 1 ? '你击败了AI' : 'AI获胜'
    });
  },

  onNewGame() {
    this.clearAsyncTasks();
    this.game.reset();
    this.ai.tt.clear();
    if (this.renderer) {
      this.renderer.clearAIMovePositions();
      this.renderer.clearLastAIMovedPiece();
      this.renderer.clearCurrentMills();
    }
    
    this.isPlayerTurn = true;
    this.isProcessing = false;
    
    this.setData({
      showWinner: false,
      showLoading: false,
      showFirsthandMenu: true,
      currentPlayer: 1,
      p1ToPlace: 9,
      p2ToPlace: 9,
      p1OnBoard: 0,
      p2OnBoard: 0,
      phaseText: '放置阶段',
      turnText: '请落子'
    });

    if (this.renderer) {
      this.renderer.draw(this.game);
    }
  },

  onThemeMenu() {
    this.setData({
      showThemeMenu: !this.data.showThemeMenu
    });
  },

  onUndo() {
    if (this.isProcessing || !this.isPlayerTurn) return;

    let undone = this.game.undo();
    let safety = 0;

    while (
      undone &&
      this.game.state.history.length > 0 &&
      (this.game.state.currentPlayer !== PLAYER_1 || this.game.state.millFormed) &&
      safety < 8
    ) {
      undone = this.game.undo();
      safety++;
    }

    if (!undone && safety === 0) return;

    this.clearAsyncTasks();
    this.isPlayerTurn = this.game.state.currentPlayer === PLAYER_1;
    this.isProcessing = false;
    this.setData({
      showLoading: false,
      showWinner: false
    });
    this.updateUI();
  },

  onRestart() {
    this.onNewGame();
  },

  onSelectDifficulty(e) {
    const level = e.currentTarget.dataset.level;
    this.setData({ difficulty: level });
    this.ai = new AI(level);
  },

  onSelectFirsthand(e) {
    const choice = e.currentTarget.dataset.choice;
    this.setData({ firsthand: choice });
  },

  onConfirmStart() {
    this.setData({ showFirsthandMenu: false });
    
    if (this.data.firsthand === 'ai') {
      this.isPlayerTurn = false;
      this.game.state.currentPlayer = 2;
      this.setData({
        currentPlayer: 2,
        turnText: 'AI思考中...'
      });
      this.isProcessing = true;
      
      this.scheduleTimeout(() => {
        this.makeAIMove();
      }, 500);
    } else {
      this.isPlayerTurn = true;
      this.game.state.currentPlayer = 1;
      this.setData({
        currentPlayer: 1,
        turnText: '请落子'
      });
    }
    
    this.updateUI();
  },

  onSelectTheme(e) {
    const theme = e.currentTarget.dataset.theme;
    this.setData({ 
      theme: theme,
      showThemeMenu: false
    });
    
    if (this.renderer) {
      this.renderer.updateColors(theme);
      if (this.game) {
        this.renderer.draw(this.game);
      }
    }
    
    wx.setStorageSync('gameTheme', theme);
  }
});


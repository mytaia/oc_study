// Wait for all classes to be defined
function checkAndInit() {
    console.log('Checking classes...', {
        Game: typeof Game,
        AI: typeof AI,
        ParticleSystem: typeof ParticleSystem,
        BackgroundParticles: typeof BackgroundParticles,
        Renderer: typeof Renderer
    });
    
    if (typeof Game !== 'undefined' && typeof AI !== 'undefined' && 
        typeof ParticleSystem !== 'undefined' && typeof BackgroundParticles !== 'undefined' && 
        typeof Renderer !== 'undefined') {
        console.log('All classes loaded, initializing game...');
        
        class NineMensMorris {
            constructor() {
                this.bgCanvas = document.getElementById('bg-canvas');
                this.gameCanvas = document.getElementById('game-canvas');
                
                this.bgParticles = new BackgroundParticles(this.bgCanvas);
                this.particleSystem = new ParticleSystem(this.bgCanvas);
                
                this.game = new Game();
                this.ai = new AI('hard');
                
                this.renderer = new Renderer(this.gameCanvas, this.particleSystem);
                
                this.isPlayerTurn = true;
                this.isProcessing = false;
                
                this.initUI();
                this.setupRenderer();
                this.startGameLoop();
                
                console.log('NineMensMorris constructor done');
            }

            initUI() {
                this.player1Card = document.getElementById('player-1-card');
                this.player2Card = document.getElementById('player-2-card');
                this.p1ToPlace = document.getElementById('p1-to-place');
                this.p2ToPlace = document.getElementById('p2-to-place');
                this.p1OnBoard = document.getElementById('p1-on-board');
                this.p2OnBoard = document.getElementById('p2-on-board');
                this.phaseText = document.querySelector('.phase-text');
                this.turnText = document.getElementById('turn-text');
                
                this.themeMenu = document.getElementById('theme-menu');
                this.themeBtns = document.querySelectorAll('.theme-btn');
                this.firsthandMenu = document.getElementById('firsthand-menu');
                this.firsthandBtns = document.querySelectorAll('.firsthand-btn');
                this.winnerOverlay = document.getElementById('winner-overlay');
                this.winnerTitle = document.getElementById('winner-title');
                this.winnerSubtitle = document.getElementById('winner-subtitle');
                this.loadingOverlay = document.getElementById('loading-overlay');
                
                document.getElementById('btn-new-game').addEventListener('click', () => {
                    console.log('New Game clicked');
                    this.newGame();
                });
                document.getElementById('btn-theme').addEventListener('click', () => this.toggleThemeMenu());
                document.getElementById('btn-undo').addEventListener('click', () => this.undo());
                document.getElementById('btn-restart').addEventListener('click', () => this.newGame());

                this.themeBtns.forEach(btn => {
                    btn.addEventListener('click', () => this.setTheme(btn.dataset.theme));
                });

                this.firsthandBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.firsthandBtns.forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    });
                });

                document.getElementById('btn-confirm-first').addEventListener('click', () => {
                    const choice = document.querySelector('.firsthand-btn.selected').dataset.choice;
                    this.firsthandMenu.classList.remove('show');
                    this.startGameWithFirstHand(choice);
                });

                document.addEventListener('click', (e) => {
                    if (!e.target.closest('#btn-theme') && !e.target.closest('.theme-menu')) {
                        this.themeMenu.classList.remove('show');
                    }
                });
                
                console.log('initUI done');
            }

            setupRenderer() {
                this.renderer.setOnPointClick((index) => this.handlePointClick(index));
            }

            handlePointClick(index) {
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
            }

            handlePlacePiece(index) {
                if (this.game.state.board[index] !== 0) return;
                
                const success = this.game.placePiece(index);
                
                if (success) {
                    this.renderer.addPlaceAnimation(index, PLAYER_1);
                    this.updateUI();
                    
                    if (this.game.state.millFormed) {
                        const mill = this.game.getMillAtPosition(PLAYER_1, index);
                        this.renderer.setCurrentMills(mill ? [mill] : []);
                        this.turnText.textContent = '选择要移除的棋子';
                        
                        setTimeout(() => {
                            this.renderer.clearCurrentMills();
                        }, 1500);
                        return;
                    }
                    
                    this.endPlayerTurn();
                }
            }

            handleMovePiece(index) {
                if (this.game.state.selectedPiece === null) {
                    if (this.game.state.board[index] === PLAYER_1) {
                        this.game.selectPiece(index);
                    }
                    return;
                }

                if (this.game.state.board[index] === PLAYER_1) {
                    this.game.selectPiece(index);
                    return;
                }

                if (this.game.state.board[index] === 0) {
                    const success = this.game.movePiece(this.game.state.selectedPiece, index);
                    
                    if (success) {
                        this.renderer.addRemoveAnimation(this.game.state.selectedPiece);
                        this.renderer.addPlaceAnimation(index, PLAYER_1);
                        this.game.deselectPiece();
                        this.updateUI();
                        
                        if (this.game.state.millFormed) {
                            const mill = this.game.getMillAtPosition(PLAYER_1, index);
                            this.renderer.setCurrentMills(mill ? [mill] : []);
                            this.turnText.textContent = '选择要移除的棋子';
                            
                            setTimeout(() => {
                                this.renderer.clearCurrentMills();
                            }, 1500);
                            return;
                        }
                        
                        this.endPlayerTurn();
                    }
                }
            }

            handleRemovePiece(index) {
                const player = this.game.state.removePiece;
                const removable = this.game.getRemovablePieces(player);
                
                if (removable.includes(index)) {
                    this.game.removePiece(index);
                    this.renderer.addRemoveAnimation(index);
                    this.renderer.clearCurrentMills();
                    this.updateUI();
                    
                    if (this.game.gameOver) {
                        this.showWinner();
                        return;
                    }
                    
                    this.endPlayerTurn();
                }
            }

            endPlayerTurn() {
                this.renderer.clearLastAIMovedPiece();
                
                if (this.game.gameOver) {
                    this.showWinner();
                    return;
                }

                this.isPlayerTurn = false;
                this.isProcessing = true;
                
                this.player1Card.classList.remove('active');
                this.player2Card.classList.add('active');
                
                this.loadingOverlay.classList.add('show');
                
                setTimeout(() => {
                    this.makeAIMove();
                }, 300);
            }

            makeAIMove() {
                this.renderer.clearLastAIMovedPiece();
                
                if (this.game.gameOver) {
                    this.loadingOverlay.classList.remove('show');
                    this.showWinner();
                    return;
                }

                setTimeout(() => {
                    const move = this.ai.makeMove(this.game);
                    
                    if (!move) {
                        this.game.gameOver = true;
                        this.game.winner = PLAYER_1;
                        this.loadingOverlay.classList.remove('show');
                        this.showWinner();
                        return;
                    }

                    this.processAIMove(move);
                }, 0);
            }
            
            processAIMove(move) {
                let movedToPos = null;
                
                if (this.game.state.phase === PHASE_PLACING) {
                    this.game.placePiece(move.to);
                    this.renderer.addPlaceAnimation(move.to, PLAYER_2);
                    movedToPos = move.to;
                } else {
                    this.game.movePiece(move.from, move.to);
                    this.renderer.addRemoveAnimation(move.from);
                    this.renderer.addPlaceAnimation(move.to, PLAYER_2);
                    this.renderer.setAIMovePositions(move.from, move.to);
                    movedToPos = move.to;
                }

                if (this.game.state.millFormed) {
                    const mill = this.game.getMillAtPosition(PLAYER_2, movedToPos);
                    this.renderer.setCurrentMills(mill ? [mill] : []);
                    
                    const removable = this.game.getRemovablePieces(this.game.state.currentPlayer);
                    const posToRemove = removable[Math.floor(Math.random() * removable.length)];
                    
                    this.renderer.setAIRemovePosition(posToRemove);
                    this.loadingOverlay.classList.remove('show');
                    
                    this.turnText.textContent = 'AI成三! 准备吃子...';
                    
                    setTimeout(() => {
                        this.renderer.clearCurrentMills();
                        
                        this.game.removePiece(posToRemove);
                        this.renderer.addRemoveAnimation(posToRemove);
                        this.renderer.clearAIRemovePosition();
                        this.renderer.clearAIMovePositions();
                        this.renderer.setLastAIMovedPiece(movedToPos);
                        
                        if (this.game.gameOver) {
                            this.showWinner();
                            return;
                        }
                        
                        this.isPlayerTurn = true;
                        this.isProcessing = false;
                        
                        this.player2Card.classList.remove('active');
                        this.player1Card.classList.add('active');
                        
                        this.updateUI();
                    }, 1500);
                    
                    return;
                }

                this.loadingOverlay.classList.remove('show');
                
                this.renderer.setLastAIMovedPiece(movedToPos);
                
                this.isPlayerTurn = true;
                this.isProcessing = false;
                
                this.player2Card.classList.remove('active');
                this.player1Card.classList.add('active');
                
                this.updateUI();
            }

            updateUI() {
                const phase = this.game.getCurrentPhase();
                
                if (phase === PHASE_PLACING) {
                    this.p1ToPlace.textContent = this.game.getPiecesRemaining(PLAYER_1);
                    this.p2ToPlace.textContent = this.game.getPiecesRemaining(PLAYER_2);
                    this.p1OnBoard.textContent = this.game.getPiecesOnBoard(PLAYER_1);
                    this.p2OnBoard.textContent = this.game.getPiecesOnBoard(PLAYER_2);
                } else {
                    this.p1ToPlace.textContent = '-';
                    this.p2ToPlace.textContent = '-';
                    this.p1OnBoard.textContent = this.game.getPiecesOnBoard(PLAYER_1);
                    this.p2OnBoard.textContent = this.game.getPiecesOnBoard(PLAYER_2);
                }
                
                this.phaseText.textContent = phase === PHASE_PLACING ? '放置阶段' : 
                                             '移动阶段';
                
                if (!this.game.state.millFormed) {
                    if (this.isPlayerTurn) {
                        this.turnText.textContent = phase === PHASE_PLACING ? '请落子' : '请走子';
                    } else {
                        this.turnText.textContent = 'AI思考中...';
                    }
                }
            }

            newGame() {
                console.log('newGame() called');
                this.game.reset();
                this.ai.tt.clear();
                
                this.isPlayerTurn = true;
                this.isProcessing = false;
                
                this.winnerOverlay.classList.remove('show');
                this.loadingOverlay.classList.remove('show');
                
                this.renderer.clearLastAIMovedPiece();
                this.renderer.clearAIRemovePosition();
                this.renderer.clearAIMovePositions();
                this.renderer.clearCurrentMills();
                
                this.firsthandMenu.classList.add('show');
                
                console.log('newGame() completed');
            }

            startGameWithFirstHand(choice) {
                if (choice === 'ai') {
                    this.isPlayerTurn = false;
                    this.game.state.currentPlayer = PLAYER_2;
                    this.player1Card.classList.remove('active');
                    this.player2Card.classList.add('active');
                    this.turnText.textContent = 'AI思考中...';
                    this.isProcessing = true;
                    
                    setTimeout(() => {
                        this.makeAIMove();
                    }, 300);
                } else {
                    this.isPlayerTurn = true;
                    this.game.state.currentPlayer = PLAYER_1;
                    this.player1Card.classList.add('active');
                    this.player2Card.classList.remove('active');
                    this.turnText.textContent = '请落子';
                }
                
                this.updateUI();
            }

            undo() {
                if (this.isProcessing || !this.isPlayerTurn) return;
                const undone = this.game.undo();
                if (undone) {
                    this.updateUI();
                }
            }

            toggleThemeMenu() {
                this.themeMenu.classList.toggle('show');
            }

            setTheme(theme) {
                document.documentElement.setAttribute('data-theme', theme);
                this.themeBtns.forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.theme === theme);
                });
                this.themeMenu.classList.remove('show');
                localStorage.setItem('gameTheme', theme);
                
                this.renderer.updateColors();
                this.bgParticles.updateThemeColors();
            }

            loadTheme() {
                const savedTheme = localStorage.getItem('gameTheme') || 'cyberpunk';
                document.documentElement.setAttribute('data-theme', savedTheme);
                this.themeBtns.forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.theme === savedTheme);
                });
                this.renderer.updateColors();
                this.bgParticles.updateThemeColors();
            }

            showWinner() {
                this.loadingOverlay.classList.remove('show');
                
                const styles = getComputedStyle(document.documentElement);
                const primary = styles.getPropertyValue('--color-primary').trim() || '#00f5ff';
                const secondary = styles.getPropertyValue('--color-secondary').trim() || '#ff00ff';
                const success = styles.getPropertyValue('--color-success').trim() || '#00ff88';
                
                const winner = this.game.winner;
                
                if (winner === PLAYER_1) {
                    this.winnerTitle.textContent = '胜利!';
                    this.winnerSubtitle.textContent = '你击败了AI';
                    this.winnerTitle.style.background = `linear-gradient(90deg, ${success}, ${primary})`;
                    this.winnerTitle.style.webkitBackgroundClip = 'text';
                    this.winnerTitle.style.backgroundClip = 'text';
                } else {
                    this.winnerTitle.textContent = '失败';
                    this.winnerSubtitle.textContent = 'AI获胜';
                    this.winnerTitle.style.background = `linear-gradient(90deg, #ff3366, ${secondary})`;
                    this.winnerTitle.style.webkitBackgroundClip = 'text';
                    this.winnerTitle.style.backgroundClip = 'text';
                }
                
                this.winnerOverlay.classList.add('show');
                
                this.particleSystem.emitExplosion(
                    this.width / 2, this.height / 2,
                    [success, primary, '#ffd700', secondary]
                );
            }

            startGameLoop() {
                const gameLoop = () => {
                    this.bgParticles.update();
                    this.bgParticles.draw();
                    
                    this.particleSystem.update();
                    this.particleSystem.draw();
                    
                    this.renderer.draw(this.game);
                    
                    requestAnimationFrame(gameLoop);
                };
                
                gameLoop();
            }

            resize() {
                this.bgCanvas.width = window.innerWidth;
                this.bgCanvas.height = window.innerHeight;
                
                this.bgParticles.resize();
                this.renderer.resize();
                
                this.width = window.innerWidth;
                this.height = window.innerHeight;
            }
        }
        
        console.log('Creating game instance...');
        const game = new NineMensMorris();
        
        game.bgCanvas.width = window.innerWidth;
        game.bgCanvas.height = window.innerHeight;
        game.bgParticles.resize();
        game.width = window.innerWidth;
        game.height = window.innerHeight;
        
        game.loadTheme();
        
        game.firsthandMenu.classList.add('show');
        
        window.addEventListener('resize', () => {
            game.resize();
        });
        
        window.game = game;
        console.log('Game initialized successfully');
    } else {
        setTimeout(checkAndInit, 100);
    }
}

// Start checking
checkAndInit();

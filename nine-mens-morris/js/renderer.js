// Constants are defined in game.js

class Renderer {
    constructor(canvas, particleSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particleSystem = particleSystem;
        
        this.boardPoints = [];
        this.hoveredPoint = null;
        this.selectedPoint = null;
        
        this.animations = [];
        this.glowAnimations = [];
        
        this.colors = {
            player1: '#00f5ff',
            player1Dark: '#00a8b3',
            player1Glow: 'rgba(0, 245, 255, 0.6)',
            player2: '#ff00ff',
            player2Dark: '#b300b3',
            player2Glow: 'rgba(255, 0, 255, 0.6)',
            boardLine: '#1a3a4a',
            boardLineGlow: 'rgba(0, 245, 255, 0.3)',
            highlight: '#00ff88',
            validMove: 'rgba(0, 255, 136, 0.5)',
            millLine: '#ffd700',
            millGlow: 'rgba(255, 215, 0, 0.6)'
        };
        
        this.colorsCache = null;
        this.lastTheme = null;
        
        this.lastAIMovedPiece = null;
        this.aiRemovePosition = null;
        this.aiMoveFrom = null;
        this.aiMoveTo = null;
        this.currentMillPositions = [];

        this.resize();
        this.setupEvents();
        this.updateColors();
    }
    
    setLastAIMovedPiece(position) {
        this.lastAIMovedPiece = position;
    }
    
    clearLastAIMovedPiece() {
        this.lastAIMovedPiece = null;
    }
    
    setAIRemovePosition(position) {
        this.aiRemovePosition = position;
    }
    
    clearAIRemovePosition() {
        this.aiRemovePosition = null;
    }
    
    setAIMovePositions(from, to) {
        this.aiMoveFrom = from;
        this.aiMoveTo = to;
    }
    
    clearAIMovePositions() {
        this.aiMoveFrom = null;
        this.aiMoveTo = null;
    }
    
    setCurrentMills(positions) {
        this.currentMillPositions = positions;
    }
    
    clearCurrentMills() {
        this.currentMillPositions = [];
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.calculateBoardPoints();
    }

    updateColors() {
        const styles = getComputedStyle(document.documentElement);
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'cyberpunk';
        
        if (this.lastTheme === currentTheme && this.colorsCache) {
            return;
        }
        
        this.lastTheme = currentTheme;
        
        const player1Color = styles.getPropertyValue('--piece-player1').trim() || styles.getPropertyValue('--color-primary').trim() || '#00f5ff';
        const player2Color = styles.getPropertyValue('--piece-player2').trim() || styles.getPropertyValue('--color-secondary').trim() || '#ff00ff';
        
        this.colorsCache = {
            player1: player1Color,
            player1Dark: styles.getPropertyValue('--piece-player1-dark').trim() || this.adjustColor(player1Color, -30),
            player1Glow: player1Color + '99',
            player2: player2Color,
            player2Dark: styles.getPropertyValue('--piece-player2-dark').trim() || this.adjustColor(player2Color, -30),
            player2Glow: player2Color + '99',
            boardLine: styles.getPropertyValue('--color-text-dim').trim() || 'rgba(255,255,255,0.3)',
            boardLineGlow: (styles.getPropertyValue('--color-primary').trim() || '#00f5ff') + '4d',
            highlight: styles.getPropertyValue('--color-success').trim() || '#00ff88',
            validMove: (styles.getPropertyValue('--color-success').trim() || '#00ff88') + '80',
            millLine: '#ffd700',
            millGlow: 'rgba(255, 215, 0, 0.6)'
        };
        
        this.colors = this.colorsCache;
    }

    adjustColor(hex, amount) {
        if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
        let color = hex.replace('#', '');
        if (color.length === 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
        }
        let r = parseInt(color.substring(0, 2), 16);
        let g = parseInt(color.substring(2, 4), 16);
        let b = parseInt(color.substring(4, 6), 16);
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    calculateBoardPoints() {
        const minDim = Math.min(this.width, this.height);
        const boardSize = minDim * 0.65;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const sizes = [boardSize, boardSize * 0.65, boardSize * 0.3];

        this.boardPoints = [];
        
        for (let ring = 0; ring < 3; ring++) {
            const size = sizes[ring];
            const half = size / 2;
            
            const squarePoints = [
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
                this.boardPoints.push({ 
                    x: squarePoints[i].x, 
                    y: squarePoints[i].y, 
                    ring: ring, 
                    index: ring * 8 + i,
                    pos: i
                });
            }
        }
    }

    setupEvents() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        this.hoveredPoint = this.findNearestPoint(pos.x, pos.y);
    }

    handleClick(e) {
        const pos = this.getMousePos(e);
        const point = this.findNearestPoint(pos.x, pos.y);
        
        if (point && this.onPointClick) {
            this.onPointClick(point.index);
        }
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const pos = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
        
        const point = this.findNearestPoint(pos.x, pos.y);
        
        if (point && this.onPointClick) {
            this.onPointClick(point.index);
        }
    }

    findNearestPoint(x, y) {
        const threshold = 30;
        
        for (const point of this.boardPoints) {
            const dx = point.x - x;
            const dy = point.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < threshold) {
                return point;
            }
        }
        
        return null;
    }

    setOnPointClick(callback) {
        this.onPointClick = callback;
    }

    draw(game) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.updateAnimations();
        this.drawBoard();
        this.drawPieces(game);
        this.drawHighlights(game);
        this.drawAnimations();
    }
    
    drawAnimations() {
        const ctx = this.ctx;
        
        for (const anim of this.animations) {
            const progress = anim.progress;
            const x = anim.x;
            const y = anim.y;
            
            if (anim.type === 'place') {
                const player = anim.player;
                const color = player === 1 ? this.colors.player1 : this.colors.player2;
                
                const pulse = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
                const radius = 22 * (1 + pulse * 0.5);
                const alpha = 1 - progress * 0.5;
                
                ctx.beginPath();
                ctx.arc(x, y, radius + 10 * (1 - progress), 0, Math.PI * 2);
                ctx.strokeStyle = color.replace(')', `, ${alpha * 0.5})`).replace('rgb', 'rgba').replace('#', '');
                ctx.strokeStyle = `rgba(${player === 1 ? '0, 245, 255' : '255, 0, 255'}, ${alpha * 0.6})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                
            } else if (anim.type === 'remove') {
                const pulse = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
                const radius = 22 * (1 + pulse * 0.8);
                const alpha = 1 - progress;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
                ctx.lineWidth = 4;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.3})`;
                ctx.fill();
            }
        }
    }

    drawBoard() {
        const ctx = this.ctx;
        
        ctx.shadowColor = this.colors.boardLineGlow;
        ctx.shadowBlur = 20;
        
        for (let ring = 0; ring < 3; ring++) {
            const points = this.boardPoints.filter(p => p.ring === ring);
            if (points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.closePath();
                
                ctx.strokeStyle = this.colors.boardLine;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        for (let pos = 1; pos <= 7; pos += 2) {
            const outer = this.boardPoints.find(p => p.ring === 0 && p.pos === pos);
            const middle = this.boardPoints.find(p => p.ring === 1 && p.pos === pos);
            const inner = this.boardPoints.find(p => p.ring === 2 && p.pos === pos);
            
            if (outer && middle) {
                ctx.beginPath();
                ctx.moveTo(outer.x, outer.y);
                ctx.lineTo(middle.x, middle.y);
                ctx.strokeStyle = this.colors.boardLine;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            if (middle && inner) {
                ctx.beginPath();
                ctx.moveTo(middle.x, middle.y);
                ctx.lineTo(inner.x, inner.y);
                ctx.strokeStyle = this.colors.boardLine;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        ctx.shadowBlur = 0;

        for (const point of this.boardPoints) {
            const isHovered = this.hoveredPoint && this.hoveredPoint.index === point.index;
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, isHovered ? 10 : 8, 0, Math.PI * 2);
            
            if (isHovered) {
                ctx.fillStyle = this.colors.highlight;
                ctx.shadowColor = this.colors.highlight;
                ctx.shadowBlur = 15;
            } else {
                ctx.fillStyle = this.colors.boardLine;
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    drawPieces(game) {
        const board = game.getBoard();
        
        for (let i = 0; i < 24; i++) {
            if (board[i] !== 0 && this.boardPoints[i]) {
                const point = this.boardPoints[i];
                const player = board[i];
                const isSelected = game.getSelectedPiece() === i;
                const isLastAIMoved = this.lastAIMovedPiece === i;
                
                this.drawPiece(point.x, point.y, player, isSelected, isLastAIMoved);
            }
        }
    }

    drawPiece(x, y, player, isSelected, isLastAIMoved = false) {
        const ctx = this.ctx;
        const color = player === 1 ? this.colors.player1 : this.colors.player2;
        const darkColor = player === 1 ? this.colors.player1Dark : this.colors.player2Dark;
        const glowColor = player === 1 ? this.colors.player1Glow : this.colors.player2Glow;
        
        const baseRadius = 22;
        const radius = isSelected ? baseRadius * 1.2 : baseRadius;
        
        if (isSelected || isLastAIMoved) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20; // 减少光晕强度
        }

        // 1. 哑光主体 - 柔和的径向渐变
        const mainGradient = ctx.createRadialGradient(
            x - radius * 0.15, y - radius * 0.15, 0,
            x, y, radius
        );
        // 哑光效果：减少高光，增加中间色调
        mainGradient.addColorStop(0, this.adjustColor(color, 40) + 'cc'); // 轻微高光
        mainGradient.addColorStop(0.3, color + 'ee'); // 主色
        mainGradient.addColorStop(0.7, color); // 中间色
        mainGradient.addColorStop(1, darkColor); // 暗部
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = mainGradient;
        ctx.fill();

        // 2. 磨砂纹理效果 - 使用多个小圆点模拟磨砂质感
        ctx.save();
        ctx.globalAlpha = 0.15;
        
        const textureCount = 8;
        for (let i = 0; i < textureCount; i++) {
            const angle = Math.PI * 2 * i / textureCount;
            const textureX = x + Math.cos(angle) * radius * 0.6;
            const textureY = y + Math.sin(angle) * radius * 0.6;
            const textureRadius = radius * 0.08;
            
            const textureGradient = ctx.createRadialGradient(
                textureX - textureRadius * 0.5, textureY - textureRadius * 0.5, 0,
                textureX, textureY, textureRadius
            );
            textureGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            textureGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(textureX, textureY, textureRadius, 0, Math.PI * 2);
            ctx.fillStyle = textureGradient;
            ctx.fill();
        }
        ctx.restore();

        // 3. 柔和高光 - 哑光表面的微弱反光
        const highlightX = x - radius * 0.25;
        const highlightY = y - radius * 0.25;
        const highlightRadius = radius * 0.2;
        
        const highlightGradient = ctx.createRadialGradient(
            highlightX - highlightRadius * 0.3, highlightY - highlightRadius * 0.3, 0,
            highlightX, highlightY, highlightRadius
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); // 弱高光
        highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(highlightX, highlightY, highlightRadius, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // 4. 边缘阴影 - 增加立体感但保持柔和
        ctx.beginPath();
        ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
        ctx.strokeStyle = darkColor + '44'; // 半透明暗色
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 5. 内部阴影 - 增加深度感
        const innerShadowRadius = radius * 0.85;
        const innerShadowGradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, innerShadowRadius
        );
        innerShadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        innerShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        ctx.arc(x, y, innerShadowRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerShadowGradient;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // 6. 表面微光 - 非常微弱的整体光泽
        const surfaceGlowRadius = radius * 0.95;
        const surfaceGlowGradient = ctx.createRadialGradient(
            x - radius * 0.1, y - radius * 0.1, 0,
            x, y, surfaceGlowRadius
        );
        surfaceGlowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        surfaceGlowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(x, y, surfaceGlowRadius, 0, Math.PI * 2);
        ctx.fillStyle = surfaceGlowGradient;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.shadowBlur = 0;
    }

    drawHighlights(game) {
        const ctx = this.ctx;
        
        // 1. 先显示成三闪烁效果（如果有）- 始终显示，不受return影响
        if (this.currentMillPositions.length > 0) {
            ctx.font = 'bold 16px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (const line of this.currentMillPositions) {
                const midIdx = line[1];
                if (this.boardPoints[midIdx]) {
                    const pt = this.boardPoints[midIdx];
                    const pulse = Math.sin(Date.now() / 80) * 0.3 + 0.7;
                    
                    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                    ctx.shadowColor = '#ffd700';
                    ctx.shadowBlur = 10;
                    ctx.fillText('成三!', pt.x, pt.y - 35);
                    ctx.shadowBlur = 0;
                }
                
                for (const idx of line) {
                    if (this.boardPoints[idx]) {
                        const point = this.boardPoints[idx];
                        const pulse = Math.sin(Date.now() / 60) * 0.4 + 0.6;
                        
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 35 + pulse * 10, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse * 0.7})`;
                        ctx.lineWidth = 3;
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 28, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.2})`;
                        ctx.fill();
                    }
                }
            }
        }
        
        // 2. 热窝标记 - 在落子阶段一直显示
        if (game.getCurrentPhase() === PHASE_PLACING && !game.gameOver) {
            const blockedPositions = game.getBlockedPositions();
            for (const idx of blockedPositions) {
                if (this.boardPoints[idx]) {
                    const point = this.boardPoints[idx];
                    
                    const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.7;
                    
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 28, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 100, 50, ${pulse})`;
                    ctx.lineWidth = 3;
                    ctx.shadowColor = 'rgba(255, 100, 50, 0.8)';
                    ctx.shadowBlur = 15;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    
                    ctx.beginPath();
                    ctx.moveTo(point.x - 8, point.y - 8);
                    ctx.lineTo(point.x + 8, point.y + 8);
                    ctx.moveTo(point.x + 8, point.y - 8);
                    ctx.lineTo(point.x - 8, point.y + 8);
                    ctx.strokeStyle = `rgba(255, 100, 50, ${pulse})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }
        
        // 3. 如果在吃子阶段，显示可移除的棋子（红色发光）
        if (game.state.millFormed && game.state.removePiece) {
            const player = game.state.removePiece;
            const removable = game.getRemovablePieces(player);
            
            for (const idx of removable) {
                if (this.boardPoints[idx]) {
                    const point = this.boardPoints[idx];
                    const pulse = Math.sin(Date.now() / 80) * 0.3 + 0.7;
                    
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 32, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
                    ctx.lineWidth = 4;
                    ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
                    ctx.shadowBlur = 20;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.2})`;
                    ctx.fill();
                }
            }
            
            return;
        }

        // 放置阶段的高亮
        if (game.getCurrentPhase() === PHASE_PLACING && !game.gameOver) {
            for (let i = 0; i < 24; i++) {
                if (game.state.board[i] === 0 && this.boardPoints[i]) {
                    const point = this.boardPoints[i];
                    const isHovered = this.hoveredPoint && this.hoveredPoint.index === i;
                    
                    if (isHovered) {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
                        ctx.fillStyle = this.colors.validMove;
                        ctx.fill();
                    }
                }
            }
        }

        // 4. 移动阶段的高亮
        if (game.getCurrentPhase() === PHASE_MOVING) {
            const currentPlayer = game.getCurrentPlayer();
            
            for (let i = 0; i < 24; i++) {
                if (game.state.board[i] === currentPlayer && this.boardPoints[i]) {
                    const point = this.boardPoints[i];
                    const isSelected = game.getSelectedPiece() === i;
                    
                    if (isSelected) {
                        const adj = ADJACENT[i];
                        for (const dest of adj) {
                            if (game.state.board[dest] === 0 && this.boardPoints[dest]) {
                                const destPoint = this.boardPoints[dest];
                                ctx.beginPath();
                                ctx.arc(destPoint.x, destPoint.y, 20, 0, Math.PI * 2);
                                ctx.fillStyle = this.colors.validMove;
                                ctx.fill();
                            }
                        }
                    }
                }
            }
        }
        
        // 5. AI吃子标记
        if (this.aiRemovePosition !== null && this.boardPoints[this.aiRemovePosition]) {
            const point = this.boardPoints[this.aiRemovePosition];
            const pulse = Math.sin(Date.now() / 60) * 0.4 + 0.6;
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, 35, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 51, 102, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 51, 102, ${pulse * 0.3})`;
            ctx.fill();
            
            ctx.font = 'bold 14px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff3366';
            ctx.shadowColor = '#ff3366';
            ctx.shadowBlur = 10;
            ctx.fillText('将被吃掉', point.x, point.y + 50);
            ctx.shadowBlur = 0;
        }
        
        // 6. AI走子路径
        if (this.aiMoveFrom !== null && this.aiMoveTo !== null) {
            if (this.boardPoints[this.aiMoveFrom] && this.boardPoints[this.aiMoveTo]) {
                const fromPt = this.boardPoints[this.aiMoveFrom];
                const toPt = this.boardPoints[this.aiMoveTo];
                
                const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
                
                ctx.beginPath();
                ctx.moveTo(fromPt.x, fromPt.y);
                ctx.lineTo(toPt.x, toPt.y);
                ctx.strokeStyle = `rgba(255, 0, 255, ${pulse})`;
                ctx.lineWidth = 4;
                ctx.setLineDash([10, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                ctx.beginPath();
                ctx.arc(fromPt.x, fromPt.y, 30, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 0, 255, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(toPt.x, toPt.y, 30, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 245, 255, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
    }

    addPlaceAnimation(index, player) {
        if (!this.boardPoints[index]) return;
        
        const point = this.boardPoints[index];
        
        this.animations.push({
            type: 'place',
            index: index,
            x: point.x,
            y: point.y,
            player: player,
            progress: 0,
            duration: 400
        });
    }

    addRemoveAnimation(index) {
        if (!this.boardPoints[index]) return;
        
        const point = this.boardPoints[index];
        
        this.animations.push({
            type: 'remove',
            index: index,
            x: point.x,
            y: point.y,
            progress: 0,
            duration: 400
        });
    }

    addMillAnimation(positions) {
        const validPositions = positions.filter(i => this.boardPoints[i]);
        
        if (validPositions.length >= 2) {
            const p1 = this.boardPoints[validPositions[0]];
            const p2 = this.boardPoints[validPositions[validPositions.length - 1]];
            
            this.glowAnimations.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y,
                progress: 0,
                duration: 500
            });
        }
    }

    updateAnimations() {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            anim.progress += 16 / anim.duration;
            
            if (anim.progress >= 1) {
                this.animations.splice(i, 1);
            }
        }

        for (let i = this.glowAnimations.length - 1; i >= 0; i--) {
            const anim = this.glowAnimations[i];
            anim.progress += 16 / anim.duration;
            
            if (anim.progress >= 1) {
                this.glowAnimations.splice(i, 1);
            }
        }
    }

    drawPieceAt(x, y, player) {
        const ctx = this.ctx;
        const color = player === 1 ? this.colors.player1 : this.colors.player2;
        const darkColor = player === 1 ? this.colors.player1Dark : this.colors.player2Dark;
        const radius = 22;
        
        // 简化的哑光磨砂效果用于动画
        const mainGradient = ctx.createRadialGradient(
            x - radius * 0.15, y - radius * 0.15, 0,
            x, y, radius
        );
        mainGradient.addColorStop(0, this.adjustColor(color, 40) + 'cc');
        mainGradient.addColorStop(0.3, color + 'ee');
        mainGradient.addColorStop(0.7, color);
        mainGradient.addColorStop(1, darkColor);
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = mainGradient;
        ctx.fill();

        // 柔和高光
        const highlightX = x - radius * 0.25;
        const highlightY = y - radius * 0.25;
        const highlightRadius = radius * 0.2;
        
        const highlightGradient = ctx.createRadialGradient(
            highlightX - highlightRadius * 0.3, highlightY - highlightRadius * 0.3, 0,
            highlightX, highlightY, highlightRadius
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(highlightX, highlightY, highlightRadius, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // 边缘阴影
        ctx.beginPath();
        ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
        ctx.strokeStyle = darkColor + '44';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

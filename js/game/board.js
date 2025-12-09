/**
 * 棋盘渲染模块
 * 负责绘制棋盘、棋子、交互效果
 */

import { EMPTY, BLACK, WHITE, BOARD_SIZE } from './rules.js';

// 星位坐标（19路棋盘）
const STAR_POINTS = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15]
];

export default class BoardRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = options.size || BOARD_SIZE;
    
    // 计算棋盘尺寸
    this.padding = options.padding || 30;
    this.boardSize = Math.min(canvas.width, canvas.height) - this.padding * 2;
    this.cellSize = this.boardSize / (this.size - 1);
    this.stoneRadius = this.cellSize * 0.45;
    
    // 偏移量，使棋盘居中
    this.offsetX = (canvas.width - this.boardSize) / 2;
    this.offsetY = (canvas.height - this.boardSize) / 2;
    
    // 颜色配置
    this.colors = {
      board: '#DEB887',      // 木色棋盘
      line: '#5D4037',       // 棋盘线
      black: '#1a1a1a',      // 黑棋
      white: '#f5f5f5',      // 白棋
      blackBorder: '#000',
      whiteBorder: '#888',
      lastMove: '#e74c3c',   // 最后落子标记
      preview: 'rgba(0,0,0,0.3)', // 预览棋子
      star: '#5D4037'        // 星位
    };

    // 预览位置
    this.previewPos = null;
    this.previewColor = BLACK;
  }

  /**
   * 坐标转换：棋盘坐标 -> 画布坐标
   */
  boardToCanvas(x, y) {
    return {
      x: this.offsetX + x * this.cellSize,
      y: this.offsetY + y * this.cellSize
    };
  }

  /**
   * 坐标转换：画布坐标 -> 棋盘坐标
   */
  canvasToBoard(canvasX, canvasY) {
    const x = Math.round((canvasX - this.offsetX) / this.cellSize);
    const y = Math.round((canvasY - this.offsetY) / this.cellSize);
    
    if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
      return { x, y, valid: true };
    }
    return { x: -1, y: -1, valid: false };
  }

  /**
   * 绘制棋盘背景
   */
  drawBackground() {
    const ctx = this.ctx;
    
    // 清空画布
    ctx.fillStyle = '#f0e6d3';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制棋盘底色
    ctx.fillStyle = this.colors.board;
    ctx.fillRect(
      this.offsetX - this.cellSize / 2,
      this.offsetY - this.cellSize / 2,
      this.boardSize + this.cellSize,
      this.boardSize + this.cellSize
    );
    
    // 添加木纹效果
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const y = this.offsetY - this.cellSize / 2 + (this.boardSize + this.cellSize) * i / 20;
      ctx.beginPath();
      ctx.moveTo(this.offsetX - this.cellSize / 2, y);
      ctx.lineTo(this.offsetX + this.boardSize + this.cellSize / 2, y);
      ctx.stroke();
    }
  }

  /**
   * 绘制棋盘网格线
   */
  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.colors.line;
    ctx.lineWidth = 1;

    // 绘制横线和竖线
    for (let i = 0; i < this.size; i++) {
      const pos = this.boardToCanvas(i, 0);
      const endPos = this.boardToCanvas(i, this.size - 1);
      
      // 竖线
      ctx.beginPath();
      ctx.moveTo(pos.x, this.offsetY);
      ctx.lineTo(pos.x, endPos.y);
      ctx.stroke();
      
      // 横线
      ctx.beginPath();
      ctx.moveTo(this.offsetX, pos.x);
      ctx.lineTo(endPos.y, pos.x);
      ctx.stroke();
    }

    // 绘制边框
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.offsetX,
      this.offsetY,
      this.boardSize,
      this.boardSize
    );
  }

  /**
   * 绘制星位
   */
  drawStarPoints() {
    const ctx = this.ctx;
    ctx.fillStyle = this.colors.star;

    for (const [x, y] of STAR_POINTS) {
      if (x < this.size && y < this.size) {
        const pos = this.boardToCanvas(x, y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.cellSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * 绘制单个棋子
   */
  drawStone(x, y, color, isLastMove = false) {
    const ctx = this.ctx;
    const pos = this.boardToCanvas(x, y);
    const radius = this.stoneRadius;

    // 绘制阴影
    ctx.beginPath();
    ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // 绘制棋子
    const gradient = ctx.createRadialGradient(
      pos.x - radius * 0.3,
      pos.y - radius * 0.3,
      radius * 0.1,
      pos.x,
      pos.y,
      radius
    );

    if (color === BLACK) {
      gradient.addColorStop(0, '#4a4a4a');
      gradient.addColorStop(1, this.colors.black);
      ctx.strokeStyle = this.colors.blackBorder;
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, this.colors.white);
      ctx.strokeStyle = this.colors.whiteBorder;
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();

    // 绘制最后落子标记
    if (isLastMove) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = color === BLACK ? '#fff' : '#000';
      ctx.fill();
    }
  }

  /**
   * 绘制预览棋子（半透明）
   */
  drawPreview(x, y, color) {
    if (x < 0 || y < 0) return;
    
    const ctx = this.ctx;
    const pos = this.boardToCanvas(x, y);
    const radius = this.stoneRadius;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color === BLACK ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.strokeStyle = color === BLACK ? 'rgba(0, 0, 0, 0.6)' : 'rgba(150, 150, 150, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * 绘制所有棋子
   */
  drawStones(board, lastMove) {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const stone = board[x][y];
        if (stone !== EMPTY) {
          const isLast = lastMove && lastMove.x === x && lastMove.y === y;
          this.drawStone(x, y, stone, isLast);
        }
      }
    }
  }

  /**
   * 完整渲染棋盘
   */
  render(board, lastMove, previewPos = null, previewColor = BLACK) {
    this.drawBackground();
    this.drawGrid();
    this.drawStarPoints();
    this.drawStones(board, lastMove);
    
    // 绘制预览
    if (previewPos && previewPos.valid && board[previewPos.x][previewPos.y] === EMPTY) {
      this.drawPreview(previewPos.x, previewPos.y, previewColor);
    }
  }

  /**
   * 更新棋盘尺寸（响应式）
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.boardSize = Math.min(width, height) - this.padding * 2;
    this.cellSize = this.boardSize / (this.size - 1);
    this.stoneRadius = this.cellSize * 0.45;
    this.offsetX = (width - this.boardSize) / 2;
    this.offsetY = (height - this.boardSize) / 2;
  }
}

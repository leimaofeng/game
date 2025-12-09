/**
 * UI管理模块
 * 负责界面元素的绘制和交互
 */

import { BLACK, WHITE } from './rules.js';

// 游戏状态
export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  SAVE_DIALOG: 'save_dialog',
  LOAD_DIALOG: 'load_dialog',
  GAME_OVER: 'game_over',
  AI_SELECT: 'ai_select'
};

// 游戏模式
export const GameMode = {
  PVP: 'pvp',      // 双人对弈
  PVE: 'pve'       // 人机对战
};

export default class UIManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.state = GameState.MENU;
    this.buttons = [];
    
    // 颜色主题
    this.theme = {
      primary: '#8B4513',      // 主色调（木色）
      secondary: '#DEB887',    // 次色调
      text: '#3E2723',         // 文字颜色
      textLight: '#5D4037',
      white: '#FFFAF0',
      black: '#1a1a1a',
      overlay: 'rgba(0, 0, 0, 0.6)',
      button: '#A0522D',
      buttonHover: '#8B4513',
      buttonText: '#FFFAF0'
    };
  }

  /**
   * 创建按钮
   */
  createButton(id, x, y, width, height, text, onClick) {
    return {
      id,
      x,
      y,
      width,
      height,
      text,
      onClick,
      isHovered: false
    };
  }

  /**
   * 绘制按钮
   */
  drawButton(button, style = {}) {
    const ctx = this.ctx;
    const { x, y, width, height, text } = button;
    
    // 按钮背景
    ctx.fillStyle = style.bgColor || this.theme.button;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    
    // 按钮边框
    ctx.strokeStyle = style.borderColor || this.theme.primary;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 按钮文字
    ctx.fillStyle = style.textColor || this.theme.buttonText;
    ctx.font = style.font || 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
  }

  /**
   * 检查点击是否在按钮上
   */
  isPointInButton(x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
  }

  /**
   * 绘制主菜单
   */
  drawMenu() {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    
    // 背景
    ctx.fillStyle = '#f0e6d3';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 装饰性背景
    this.drawMenuBackground();
    
    // 标题
    ctx.fillStyle = this.theme.text;
    ctx.font = 'bold 48px "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText('围 棋', centerX, 120);
    
    // 副标题
    ctx.font = '18px Arial';
    ctx.fillStyle = this.theme.textLight;
    ctx.fillText('传承千年的智慧博弈', centerX, 160);
    
    // 按钮
    this.buttons = [];
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = centerX - buttonWidth / 2;
    let buttonY = 220;
    
    // 双人对弈按钮
    const pvpBtn = this.createButton('pvp', buttonX, buttonY, buttonWidth, buttonHeight, '双人对弈');
    this.buttons.push(pvpBtn);
    this.drawButton(pvpBtn);
    
    // 人机对战按钮
    buttonY += 70;
    const pveBtn = this.createButton('pve', buttonX, buttonY, buttonWidth, buttonHeight, '人机对战');
    this.buttons.push(pveBtn);
    this.drawButton(pveBtn);
    
    // 继续游戏按钮（如果有存档）
    buttonY += 70;
    const continueBtn = this.createButton('continue', buttonX, buttonY, buttonWidth, buttonHeight, '载入存档');
    this.buttons.push(continueBtn);
    this.drawButton(continueBtn);
  }

  /**
   * 绘制菜单背景装饰
   */
  drawMenuBackground() {
    const ctx = this.ctx;
    
    // 绘制简单的棋盘图案作为装饰
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    const startX = 50;
    const startY = this.height - 200;
    
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + i * gridSize);
      ctx.lineTo(startX + 7 * gridSize, startY + i * gridSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(startX + i * gridSize, startY);
      ctx.lineTo(startX + i * gridSize, startY + 7 * gridSize);
      ctx.stroke();
    }
    
    // 装饰性棋子
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.arc(startX + 2 * gridSize, startY + 2 * gridSize, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(startX + 4 * gridSize, startY + 3 * gridSize, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 绘制AI难度选择界面
   */
  drawAISelect() {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    
    // 背景
    ctx.fillStyle = '#f0e6d3';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 标题
    ctx.fillStyle = this.theme.text;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('选择难度', centerX, 100);
    
    // 按钮
    this.buttons = [];
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = centerX - buttonWidth / 2;
    let buttonY = 160;
    
    const levels = [
      { id: 'easy', text: '简单' },
      { id: 'medium', text: '中等' },
      { id: 'hard', text: '困难' }
    ];
    
    for (const level of levels) {
      const btn = this.createButton(level.id, buttonX, buttonY, buttonWidth, buttonHeight, level.text);
      this.buttons.push(btn);
      this.drawButton(btn);
      buttonY += 70;
    }
    
    // 选择执子颜色
    ctx.fillStyle = this.theme.text;
    ctx.font = '20px Arial';
    ctx.fillText('选择执子', centerX, buttonY + 20);
    
    buttonY += 50;
    const colorBtnWidth = 80;
    
    const blackBtn = this.createButton('play_black', centerX - colorBtnWidth - 20, buttonY, colorBtnWidth, 45, '执黑');
    this.buttons.push(blackBtn);
    this.drawButton(blackBtn, { bgColor: '#1a1a1a' });
    
    const whiteBtn = this.createButton('play_white', centerX + 20, buttonY, colorBtnWidth, 45, '执白');
    this.buttons.push(whiteBtn);
    this.drawButton(whiteBtn, { bgColor: '#f5f5f5', textColor: '#333' });
    
    // 返回按钮
    buttonY += 80;
    const backBtn = this.createButton('back', buttonX, buttonY, buttonWidth, buttonHeight, '返回');
    this.buttons.push(backBtn);
    this.drawButton(backBtn);
  }

  /**
   * 绘制游戏界面的顶部信息栏
   */
  drawGameHeader(gameState) {
    const ctx = this.ctx;
    const { currentPlayer, capturedBlack, capturedWhite, gameMode, moveCount } = gameState;
    
    // 顶部栏背景
    ctx.fillStyle = this.theme.secondary;
    ctx.fillRect(0, 0, this.width, 60);
    ctx.strokeStyle = this.theme.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(this.width, 60);
    ctx.stroke();
    
    // 当前执子方
    const stoneY = 30;
    const stoneRadius = 15;
    
    // 黑方信息
    ctx.fillStyle = this.theme.black;
    ctx.beginPath();
    ctx.arc(40, stoneY, stoneRadius, 0, Math.PI * 2);
    ctx.fill();
    if (currentPlayer === BLACK) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    ctx.fillStyle = this.theme.text;
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`提子: ${capturedWhite}`, 65, 35);
    
    // 白方信息
    ctx.fillStyle = this.theme.white;
    ctx.beginPath();
    ctx.arc(this.width - 40, stoneY, stoneRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = currentPlayer === WHITE ? '#e74c3c' : '#888';
    ctx.lineWidth = currentPlayer === WHITE ? 3 : 1;
    ctx.stroke();
    
    ctx.fillStyle = this.theme.text;
    ctx.textAlign = 'right';
    ctx.fillText(`提子: ${capturedBlack}`, this.width - 65, 35);
    
    // 中间显示模式和手数
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    const modeText = gameMode === GameMode.PVP ? '双人对弈' : '人机对战';
    ctx.fillText(`${modeText} · 第${moveCount}手`, this.width / 2, 25);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = this.theme.textLight;
    ctx.fillText(currentPlayer === BLACK ? '黑方落子' : '白方落子', this.width / 2, 45);
  }

  /**
   * 绘制游戏界面的底部操作栏
   */
  drawGameFooter(boardBottom) {
    const ctx = this.ctx;
    const footerY = boardBottom + 10;
    const buttonWidth = 70;
    const buttonHeight = 40;
    const gap = 15;
    const totalWidth = buttonWidth * 5 + gap * 4;
    let startX = (this.width - totalWidth) / 2;
    
    this.buttons = [];
    
    const footerButtons = [
      { id: 'undo', text: '悔棋' },
      { id: 'pass', text: '停一手' },
      { id: 'save', text: '保存' },
      { id: 'resign', text: '认输' },
      { id: 'menu', text: '菜单' }
    ];
    
    for (const btnInfo of footerButtons) {
      const btn = this.createButton(btnInfo.id, startX, footerY, buttonWidth, buttonHeight, btnInfo.text);
      this.buttons.push(btn);
      this.drawButton(btn, { font: '14px Arial' });
      startX += buttonWidth + gap;
    }
  }

  /**
   * 绘制存档对话框
   */
  drawSaveDialog(saveList) {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const dialogWidth = 300;
    const dialogHeight = 400;
    
    // 遮罩层
    ctx.fillStyle = this.theme.overlay;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 对话框背景
    ctx.fillStyle = this.theme.white;
    ctx.beginPath();
    ctx.roundRect(centerX - dialogWidth / 2, centerY - dialogHeight / 2, dialogWidth, dialogHeight, 12);
    ctx.fill();
    ctx.strokeStyle = this.theme.primary;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 标题
    ctx.fillStyle = this.theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('存档管理', centerX, centerY - dialogHeight / 2 + 40);
    
    // 存档列表
    this.buttons = [];
    const slotWidth = 260;
    const slotHeight = 50;
    const slotX = centerX - slotWidth / 2;
    let slotY = centerY - dialogHeight / 2 + 70;
    
    for (let i = 0; i < 5; i++) {
      const save = saveList[i];
      const text = save ? `${save.timestamp} (${save.moveCount}手)` : `存档位 ${i + 1} (空)`;
      const btn = this.createButton(`slot_${i}`, slotX, slotY, slotWidth, slotHeight, text);
      this.buttons.push(btn);
      this.drawButton(btn, { 
        bgColor: save ? this.theme.secondary : '#e0e0e0',
        font: '14px Arial'
      });
      slotY += 60;
    }
    
    // 关闭按钮
    const closeBtn = this.createButton('close_dialog', slotX, slotY + 10, slotWidth, 45, '关闭');
    this.buttons.push(closeBtn);
    this.drawButton(closeBtn);
  }

  /**
   * 绘制游戏结束界面
   */
  drawGameOver(result) {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const dialogWidth = 280;
    const dialogHeight = 300;
    
    // 遮罩层
    ctx.fillStyle = this.theme.overlay;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 对话框背景
    ctx.fillStyle = this.theme.white;
    ctx.beginPath();
    ctx.roundRect(centerX - dialogWidth / 2, centerY - dialogHeight / 2, dialogWidth, dialogHeight, 12);
    ctx.fill();
    
    // 标题
    ctx.fillStyle = this.theme.text;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('对局结束', centerX, centerY - 100);
    
    // 结果
    const winnerText = result.winner === BLACK ? '黑方胜' : '白方胜';
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = result.winner === BLACK ? '#1a1a1a' : '#666';
    ctx.fillText(winnerText, centerX, centerY - 40);
    
    // 详细信息
    ctx.font = '16px Arial';
    ctx.fillStyle = this.theme.textLight;
    ctx.fillText(`黑方: ${result.black.toFixed(1)} 目`, centerX, centerY + 10);
    ctx.fillText(`白方: ${result.white.toFixed(1)} 目`, centerX, centerY + 35);
    ctx.fillText(`胜 ${result.margin.toFixed(1)} 目`, centerX, centerY + 60);
    
    // 按钮
    this.buttons = [];
    const buttonWidth = 120;
    const buttonHeight = 45;
    
    const newGameBtn = this.createButton('new_game', centerX - buttonWidth - 10, centerY + 90, buttonWidth, buttonHeight, '再来一局');
    this.buttons.push(newGameBtn);
    this.drawButton(newGameBtn);
    
    const menuBtn = this.createButton('back_menu', centerX + 10, centerY + 90, buttonWidth, buttonHeight, '返回菜单');
    this.buttons.push(menuBtn);
    this.drawButton(menuBtn);
  }

  /**
   * 绘制提示消息
   */
  drawToast(message) {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(centerX - 100, this.height - 100, 200, 40, 20);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, centerX, this.height - 80);
  }

  /**
   * 处理点击事件
   */
  handleClick(x, y) {
    for (const button of this.buttons) {
      if (this.isPointInButton(x, y, button)) {
        return button.id;
      }
    }
    return null;
  }

  /**
   * 更新画布尺寸
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
}

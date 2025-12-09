/**
 * 围棋游戏主逻辑
 * 整合所有模块，处理游戏流程
 */

import GoRules, { BLACK, WHITE, BOARD_SIZE } from './game/rules.js';
import BoardRenderer from './game/board.js';
import GoAI from './game/ai.js';
import StorageManager from './game/storage.js';
import UIManager, { GameState, GameMode } from './game/ui.js';

export default class WeiqiGame {
  constructor() {
    // 获取画布
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.screenWidth = systemInfo.windowWidth;
    this.screenHeight = systemInfo.windowHeight;
    this.pixelRatio = systemInfo.pixelRatio;
    
    // 设置画布尺寸
    this.canvas.width = this.screenWidth;
    this.canvas.height = this.screenHeight;
    
    // 初始化模块
    this.rules = new GoRules(BOARD_SIZE);
    this.board = new BoardRenderer(this.canvas, {
      size: BOARD_SIZE,
      padding: 25
    });
    this.ai = null;
    this.storage = new StorageManager();
    this.ui = new UIManager(this.canvas);
    
    // 游戏状态
    this.gameState = GameState.MENU;
    this.gameMode = GameMode.PVP;
    this.aiColor = WHITE;
    this.aiLevel = 'medium';
    this.playerColor = BLACK;
    
    // 预览位置
    this.previewPos = null;
    
    // 提示消息
    this.toastMessage = null;
    this.toastTimer = null;
    
    // 绑定事件
    this.bindEvents();
    
    // 开始渲染
    this.render();
  }

  /**
   * 绑定触摸事件
   */
  bindEvents() {
    wx.onTouchStart(this.onTouchStart.bind(this));
    wx.onTouchMove(this.onTouchMove.bind(this));
    wx.onTouchEnd(this.onTouchEnd.bind(this));
  }

  /**
   * 触摸开始
   */
  onTouchStart(e) {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  /**
   * 触摸移动（用于预览落子位置）
   */
  onTouchMove(e) {
    if (this.gameState !== GameState.PLAYING) return;
    
    const touch = e.touches[0];
    const boardPos = this.board.canvasToBoard(touch.clientX, touch.clientY);
    
    if (boardPos.valid) {
      this.previewPos = boardPos;
      this.render();
    }
  }

  /**
   * 触摸结束
   */
  onTouchEnd(e) {
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    
    // 处理不同界面的点击
    switch (this.gameState) {
      case GameState.MENU:
        this.handleMenuClick(x, y);
        break;
      case GameState.AI_SELECT:
        this.handleAISelectClick(x, y);
        break;
      case GameState.PLAYING:
        this.handleGameClick(x, y);
        break;
      case GameState.SAVE_DIALOG:
      case GameState.LOAD_DIALOG:
        this.handleDialogClick(x, y);
        break;
      case GameState.GAME_OVER:
        this.handleGameOverClick(x, y);
        break;
    }
    
    this.previewPos = null;
    this.render();
  }

  /**
   * 处理主菜单点击
   */
  handleMenuClick(x, y) {
    const buttonId = this.ui.handleClick(x, y);
    
    switch (buttonId) {
      case 'pvp':
        this.startGame(GameMode.PVP);
        break;
      case 'pve':
        this.gameState = GameState.AI_SELECT;
        break;
      case 'continue':
        this.gameState = GameState.LOAD_DIALOG;
        break;
    }
  }

  /**
   * 处理AI选择界面点击
   */
  handleAISelectClick(x, y) {
    const buttonId = this.ui.handleClick(x, y);
    
    switch (buttonId) {
      case 'easy':
      case 'medium':
      case 'hard':
        this.aiLevel = buttonId;
        this.showToast(`难度: ${buttonId === 'easy' ? '简单' : buttonId === 'medium' ? '中等' : '困难'}`);
        break;
      case 'play_black':
        this.playerColor = BLACK;
        this.aiColor = WHITE;
        this.startGame(GameMode.PVE);
        break;
      case 'play_white':
        this.playerColor = WHITE;
        this.aiColor = BLACK;
        this.startGame(GameMode.PVE);
        // AI先手
        setTimeout(() => this.makeAIMove(), 500);
        break;
      case 'back':
        this.gameState = GameState.MENU;
        break;
    }
  }

  /**
   * 处理游戏界面点击
   */
  handleGameClick(x, y) {
    // 检查是否点击了底部按钮
    const buttonId = this.ui.handleClick(x, y);
    
    if (buttonId) {
      this.handleGameButton(buttonId);
      return;
    }
    
    // 检查是否点击了棋盘
    const boardPos = this.board.canvasToBoard(x, y);
    if (boardPos.valid) {
      this.handleBoardClick(boardPos.x, boardPos.y);
    }
  }

  /**
   * 处理游戏按钮点击
   */
  handleGameButton(buttonId) {
    switch (buttonId) {
      case 'undo':
        this.undoMove();
        break;
      case 'pass':
        this.pass();
        break;
      case 'save':
        this.gameState = GameState.SAVE_DIALOG;
        break;
      case 'resign':
        this.resign();
        break;
      case 'menu':
        this.gameState = GameState.MENU;
        break;
    }
  }

  /**
   * 处理棋盘点击（落子）
   */
  handleBoardClick(x, y) {
    // 人机模式下，非玩家回合不能落子
    if (this.gameMode === GameMode.PVE && this.rules.currentPlayer !== this.playerColor) {
      this.showToast('请等待AI落子');
      return;
    }
    
    const result = this.rules.makeMove(x, y);
    
    if (result.success) {
      // 自动保存
      this.autoSave();
      
      // 人机模式下，AI落子
      if (this.gameMode === GameMode.PVE && this.rules.currentPlayer === this.aiColor) {
        setTimeout(() => this.makeAIMove(), 300);
      }
    } else {
      this.showToast(result.reason);
    }
  }

  /**
   * AI落子
   */
  makeAIMove() {
    if (this.gameState !== GameState.PLAYING) return;
    if (this.rules.currentPlayer !== this.aiColor) return;
    
    const move = this.ai.getMove(this.aiColor);
    
    if (move) {
      const result = this.rules.makeMove(move.x, move.y);
      if (result.success) {
        this.autoSave();
        this.render();
      }
    } else {
      // AI选择pass
      this.rules.pass();
      this.showToast('AI停一手');
      this.render();
    }
  }

  /**
   * 悔棋
   */
  undoMove() {
    // 人机模式下悔两步（包括AI的那步）
    if (this.gameMode === GameMode.PVE) {
      this.rules.undoMove();
      this.rules.undoMove();
    } else {
      const result = this.rules.undoMove();
      if (!result.success) {
        this.showToast(result.reason);
      }
    }
  }

  /**
   * 停一手（Pass）
   */
  pass() {
    const result = this.rules.pass();
    
    if (result.gameEnd) {
      this.endGame();
    } else {
      this.showToast('停一手');
      
      // 人机模式下AI落子
      if (this.gameMode === GameMode.PVE) {
        setTimeout(() => this.makeAIMove(), 300);
      }
    }
  }

  /**
   * 认输
   */
  resign() {
    const winner = this.rules.currentPlayer === BLACK ? WHITE : BLACK;
    this.gameState = GameState.GAME_OVER;
    this.gameResult = {
      winner,
      black: 0,
      white: 0,
      margin: 0,
      resigned: true
    };
  }

  /**
   * 结束游戏
   */
  endGame() {
    this.gameResult = this.rules.calculateScore();
    this.gameState = GameState.GAME_OVER;
  }

  /**
   * 处理对话框点击
   */
  handleDialogClick(x, y) {
    const buttonId = this.ui.handleClick(x, y);
    
    if (buttonId === 'close_dialog') {
      this.gameState = this.rules.moveHistory.length > 0 ? GameState.PLAYING : GameState.MENU;
      return;
    }
    
    if (buttonId && buttonId.startsWith('slot_')) {
      const slotIndex = parseInt(buttonId.split('_')[1]);
      
      if (this.gameState === GameState.SAVE_DIALOG) {
        this.saveGame(slotIndex);
      } else {
        this.loadGame(slotIndex);
      }
    }
  }

  /**
   * 处理游戏结束界面点击
   */
  handleGameOverClick(x, y) {
    const buttonId = this.ui.handleClick(x, y);
    
    switch (buttonId) {
      case 'new_game':
        this.startGame(this.gameMode);
        if (this.gameMode === GameMode.PVE && this.playerColor === WHITE) {
          setTimeout(() => this.makeAIMove(), 500);
        }
        break;
      case 'back_menu':
        this.gameState = GameState.MENU;
        break;
    }
  }

  /**
   * 开始新游戏
   */
  startGame(mode) {
    this.gameMode = mode;
    this.gameState = GameState.PLAYING;
    this.rules.init();
    
    if (mode === GameMode.PVE) {
      this.ai = new GoAI(this.rules, this.aiLevel);
    }
    
    // 调整棋盘渲染区域
    this.board.resize(this.screenWidth, this.screenHeight - 120);
    this.board.offsetY += 60; // 为顶部信息栏留空间
  }

  /**
   * 保存游戏
   */
  saveGame(slotIndex) {
    const state = this.getFullGameState();
    const result = this.storage.saveGame(state, slotIndex);
    this.showToast(result.message);
    this.gameState = GameState.PLAYING;
  }

  /**
   * 载入游戏
   */
  loadGame(slotIndex) {
    const result = this.storage.loadGame(slotIndex);
    
    if (result.success) {
      this.restoreGameState(result.data);
      this.gameState = GameState.PLAYING;
      this.showToast('载入成功');
    } else {
      this.showToast(result.message);
    }
  }

  /**
   * 自动保存
   */
  autoSave() {
    const state = this.getFullGameState();
    this.storage.autoSave(state);
  }

  /**
   * 获取完整游戏状态
   */
  getFullGameState() {
    return {
      ...this.rules.getBoardState(),
      moveHistory: this.rules.moveHistory,
      boardHistory: this.rules.boardHistory,
      gameMode: this.gameMode,
      aiColor: this.aiColor,
      aiLevel: this.aiLevel,
      playerColor: this.playerColor
    };
  }

  /**
   * 恢复游戏状态
   */
  restoreGameState(data) {
    this.gameMode = data.gameMode || GameMode.PVP;
    this.aiColor = data.aiColor || WHITE;
    this.aiLevel = data.aiLevel || 'medium';
    this.playerColor = data.playerColor || BLACK;
    
    this.rules.loadState(data);
    
    if (this.gameMode === GameMode.PVE) {
      this.ai = new GoAI(this.rules, this.aiLevel);
    }
    
    // 调整棋盘
    this.board.resize(this.screenWidth, this.screenHeight - 120);
    this.board.offsetY += 60;
  }

  /**
   * 显示提示消息
   */
  showToast(message) {
    this.toastMessage = message;
    
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    
    this.toastTimer = setTimeout(() => {
      this.toastMessage = null;
      this.render();
    }, 2000);
    
    this.render();
  }

  /**
   * 渲染游戏画面
   */
  render() {
    const ctx = this.ctx;
    
    // 清空画布
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    switch (this.gameState) {
      case GameState.MENU:
        this.ui.drawMenu();
        break;
        
      case GameState.AI_SELECT:
        this.ui.drawAISelect();
        break;
        
      case GameState.PLAYING:
        this.renderGame();
        break;
        
      case GameState.SAVE_DIALOG:
      case GameState.LOAD_DIALOG:
        this.renderGame();
        this.ui.drawSaveDialog(this.storage.getSaveList());
        break;
        
      case GameState.GAME_OVER:
        this.renderGame();
        this.ui.drawGameOver(this.gameResult);
        break;
    }
    
    // 显示提示消息
    if (this.toastMessage) {
      this.ui.drawToast(this.toastMessage);
    }
  }

  /**
   * 渲染游戏画面
   */
  renderGame() {
    const state = this.rules.getBoardState();
    
    // 绘制顶部信息栏
    this.ui.drawGameHeader({
      currentPlayer: state.currentPlayer,
      capturedBlack: state.capturedBlack,
      capturedWhite: state.capturedWhite,
      gameMode: this.gameMode,
      moveCount: state.moveCount
    });
    
    // 绘制棋盘
    this.board.render(
      state.board,
      state.lastMove,
      this.previewPos,
      state.currentPlayer
    );
    
    // 绘制底部操作栏
    const boardBottom = this.board.offsetY + this.board.boardSize + this.board.cellSize / 2;
    this.ui.drawGameFooter(boardBottom);
  }
}

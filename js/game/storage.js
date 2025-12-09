/**
 * 存档管理模块
 * 负责棋局的保存和载入
 */

const STORAGE_KEY = 'weiqi_saves';
const MAX_SAVES = 5;

export default class StorageManager {
  constructor() {
    this.saves = [];
    this.loadSaveList();
  }

  /**
   * 加载存档列表
   */
  loadSaveList() {
    try {
      const data = wx.getStorageSync(STORAGE_KEY);
      this.saves = data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('加载存档列表失败:', e);
      this.saves = [];
    }
  }

  /**
   * 保存存档列表到本地
   */
  saveSaveList() {
    try {
      wx.setStorageSync(STORAGE_KEY, JSON.stringify(this.saves));
    } catch (e) {
      console.error('保存存档列表失败:', e);
    }
  }

  /**
   * 保存棋局
   */
  saveGame(gameState, slotIndex = -1) {
    const saveData = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('zh-CN'),
      gameMode: gameState.gameMode,
      moveCount: gameState.moveHistory ? gameState.moveHistory.length : 0,
      currentPlayer: gameState.currentPlayer,
      board: gameState.board,
      capturedBlack: gameState.capturedBlack,
      capturedWhite: gameState.capturedWhite,
      moveHistory: gameState.moveHistory,
      boardHistory: gameState.boardHistory,
      lastMove: gameState.lastMove,
      koPoint: gameState.koPoint,
      aiColor: gameState.aiColor,
      aiLevel: gameState.aiLevel
    };

    if (slotIndex >= 0 && slotIndex < this.saves.length) {
      // 覆盖指定存档
      this.saves[slotIndex] = saveData;
    } else {
      // 新建存档
      if (this.saves.length >= MAX_SAVES) {
        // 移除最旧的存档
        this.saves.shift();
      }
      this.saves.push(saveData);
    }

    this.saveSaveList();
    return { success: true, message: '保存成功' };
  }

  /**
   * 载入棋局
   */
  loadGame(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.saves.length) {
      return { success: false, message: '存档不存在' };
    }

    const saveData = this.saves[slotIndex];
    return {
      success: true,
      data: saveData
    };
  }

  /**
   * 删除存档
   */
  deleteSave(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.saves.length) {
      return { success: false, message: '存档不存在' };
    }

    this.saves.splice(slotIndex, 1);
    this.saveSaveList();
    return { success: true, message: '删除成功' };
  }

  /**
   * 获取所有存档信息
   */
  getSaveList() {
    return this.saves.map((save, index) => ({
      index,
      id: save.id,
      timestamp: save.timestamp,
      gameMode: save.gameMode,
      moveCount: save.moveCount,
      currentPlayer: save.currentPlayer === 1 ? '黑方' : '白方'
    }));
  }

  /**
   * 检查是否有存档
   */
  hasSaves() {
    return this.saves.length > 0;
  }

  /**
   * 清空所有存档
   */
  clearAllSaves() {
    this.saves = [];
    this.saveSaveList();
    return { success: true, message: '已清空所有存档' };
  }

  /**
   * 自动保存（用于意外退出恢复）
   */
  autoSave(gameState) {
    try {
      wx.setStorageSync('weiqi_autosave', JSON.stringify({
        ...gameState,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('自动保存失败:', e);
    }
  }

  /**
   * 载入自动保存
   */
  loadAutoSave() {
    try {
      const data = wx.getStorageSync('weiqi_autosave');
      if (data) {
        return { success: true, data: JSON.parse(data) };
      }
    } catch (e) {
      console.error('载入自动保存失败:', e);
    }
    return { success: false };
  }

  /**
   * 清除自动保存
   */
  clearAutoSave() {
    try {
      wx.removeStorageSync('weiqi_autosave');
    } catch (e) {
      console.error('清除自动保存失败:', e);
    }
  }
}

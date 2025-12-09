/**
 * 围棋AI模块
 * 基于简单评估函数和蒙特卡洛方法的AI对手
 */

import { EMPTY, BLACK, WHITE, BOARD_SIZE } from './rules.js';

export default class GoAI {
  constructor(rules, level = 'medium') {
    this.rules = rules;
    this.level = level;
    this.size = rules.size;
    
    // 不同难度的模拟次数
    this.simulationCounts = {
      easy: 50,
      medium: 200,
      hard: 500
    };
  }

  /**
   * 获取AI的下一步落子
   */
  getMove(color) {
    const validMoves = this.rules.getAllValidMoves(color);
    
    if (validMoves.length === 0) {
      return null; // 无处可下，需要pass
    }

    // 根据难度选择策略
    switch (this.level) {
      case 'easy':
        return this.getEasyMove(validMoves, color);
      case 'medium':
        return this.getMediumMove(validMoves, color);
      case 'hard':
        return this.getHardMove(validMoves, color);
      default:
        return this.getMediumMove(validMoves, color);
    }
  }

  /**
   * 简单难度：随机 + 基本规则
   */
  getEasyMove(validMoves, color) {
    // 优先考虑能提子的位置
    const captureMoves = this.findCaptureMoves(validMoves, color);
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }

    // 避免送死的位置
    const safeMoves = this.filterSafeMoves(validMoves, color);
    if (safeMoves.length > 0) {
      return safeMoves[Math.floor(Math.random() * safeMoves.length)];
    }

    // 随机选择
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  /**
   * 中等难度：评估函数 + 简单策略
   */
  getMediumMove(validMoves, color) {
    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const score = this.evaluateMove(move.x, move.y, color);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove || validMoves[0];
  }

  /**
   * 困难难度：蒙特卡洛树搜索简化版
   */
  getHardMove(validMoves, color) {
    const simCount = this.simulationCounts.hard;
    let bestMove = null;
    let bestWins = -1;

    for (const move of validMoves) {
      let wins = 0;
      
      for (let i = 0; i < simCount / validMoves.length; i++) {
        if (this.simulateGame(move, color)) {
          wins++;
        }
      }

      // 加入评估分数作为辅助
      const evalScore = this.evaluateMove(move.x, move.y, color);
      const totalScore = wins + evalScore * 0.1;

      if (totalScore > bestWins) {
        bestWins = totalScore;
        bestMove = move;
      }
    }

    return bestMove || validMoves[0];
  }

  /**
   * 评估一个落子位置的分数
   */
  evaluateMove(x, y, color) {
    let score = 0;
    const opponent = color === BLACK ? WHITE : BLACK;

    // 保存当前状态
    const originalBoard = this.rules.board.map(row => [...row]);

    // 模拟落子
    this.rules.board[x][y] = color;

    // 1. 提子得分
    const captured = this.rules.getCapturedStones(x, y, color);
    score += captured.length * 10;

    // 2. 位置得分（金角银边草肚皮）
    score += this.getPositionScore(x, y);

    // 3. 连接得分
    score += this.getConnectionScore(x, y, color);

    // 4. 眼位潜力
    score += this.getEyePotential(x, y, color);

    // 5. 威胁对方的分数
    score += this.getThreatScore(x, y, color, opponent);

    // 6. 防守分数（保护己方弱棋）
    score += this.getDefenseScore(x, y, color);

    // 恢复棋盘
    this.rules.board = originalBoard;

    return score;
  }

  /**
   * 位置分数：角 > 边 > 中央
   */
  getPositionScore(x, y) {
    const center = Math.floor(this.size / 2);
    const distFromEdge = Math.min(x, y, this.size - 1 - x, this.size - 1 - y);
    
    // 角部区域
    if (distFromEdge <= 3) {
      if (x <= 3 && y <= 3) return 5;
      if (x <= 3 && y >= this.size - 4) return 5;
      if (x >= this.size - 4 && y <= 3) return 5;
      if (x >= this.size - 4 && y >= this.size - 4) return 5;
      return 3; // 边
    }
    
    // 中央
    const distFromCenter = Math.abs(x - center) + Math.abs(y - center);
    return Math.max(0, 2 - distFromCenter * 0.1);
  }

  /**
   * 连接分数：与己方棋子相邻得分
   */
  getConnectionScore(x, y, color) {
    let score = 0;
    const neighbors = this.rules.getNeighbors(x, y);
    
    for (const n of neighbors) {
      if (this.rules.board[n.x][n.y] === color) {
        score += 2;
      }
    }
    
    return score;
  }

  /**
   * 眼位潜力评估
   */
  getEyePotential(x, y, color) {
    let score = 0;
    const neighbors = this.rules.getNeighbors(x, y);
    let friendlyCount = 0;
    let emptyCount = 0;

    for (const n of neighbors) {
      if (this.rules.board[n.x][n.y] === color) {
        friendlyCount++;
      } else if (this.rules.board[n.x][n.y] === EMPTY) {
        emptyCount++;
      }
    }

    // 被己方棋子包围的空点有眼位潜力
    if (friendlyCount >= 3) {
      score += 3;
    }

    return score;
  }

  /**
   * 威胁分数：减少对方的气
   */
  getThreatScore(x, y, color, opponent) {
    let score = 0;
    const neighbors = this.rules.getNeighbors(x, y);

    for (const n of neighbors) {
      if (this.rules.board[n.x][n.y] === opponent) {
        const group = this.rules.getGroup(n.x, n.y);
        // 对方棋块气少时，威胁更大
        if (group.liberties.size <= 2) {
          score += (3 - group.liberties.size) * 5;
        }
      }
    }

    return score;
  }

  /**
   * 防守分数：保护己方弱棋
   */
  getDefenseScore(x, y, color) {
    let score = 0;
    const neighbors = this.rules.getNeighbors(x, y);

    for (const n of neighbors) {
      if (this.rules.board[n.x][n.y] === color) {
        const group = this.rules.getGroup(n.x, n.y);
        // 己方棋块气少时，需要保护
        if (group.liberties.size <= 2) {
          score += (3 - group.liberties.size) * 8;
        }
      }
    }

    return score;
  }

  /**
   * 找出能提子的落子点
   */
  findCaptureMoves(validMoves, color) {
    const captureMoves = [];
    
    for (const move of validMoves) {
      const validation = this.rules.isValidMove(move.x, move.y, color);
      if (validation.valid && validation.captured && validation.captured.length > 0) {
        captureMoves.push(move);
      }
    }
    
    return captureMoves;
  }

  /**
   * 过滤掉危险的落子点
   */
  filterSafeMoves(validMoves, color) {
    const safeMoves = [];
    
    for (const move of validMoves) {
      // 模拟落子后检查是否安全
      const originalBoard = this.rules.board.map(row => [...row]);
      this.rules.board[move.x][move.y] = color;
      
      const group = this.rules.getGroup(move.x, move.y);
      const isSafe = group.liberties.size >= 2;
      
      this.rules.board = originalBoard;
      
      if (isSafe) {
        safeMoves.push(move);
      }
    }
    
    return safeMoves;
  }

  /**
   * 模拟一局游戏（用于蒙特卡洛）
   */
  simulateGame(firstMove, aiColor) {
    // 创建棋盘副本
    const boardCopy = this.rules.board.map(row => [...row]);
    const simBoard = boardCopy.map(row => [...row]);
    
    // 执行第一步
    simBoard[firstMove.x][firstMove.y] = aiColor;
    
    let currentColor = aiColor === BLACK ? WHITE : BLACK;
    let passCount = 0;
    let moveCount = 0;
    const maxMoves = 100;

    while (passCount < 2 && moveCount < maxMoves) {
      const validMoves = this.getSimValidMoves(simBoard, currentColor);
      
      if (validMoves.length === 0) {
        passCount++;
      } else {
        passCount = 0;
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        simBoard[randomMove.x][randomMove.y] = currentColor;
      }
      
      currentColor = currentColor === BLACK ? WHITE : BLACK;
      moveCount++;
    }

    // 简单评估胜负
    const score = this.simpleScore(simBoard, aiColor);
    return score > 0;
  }

  /**
   * 获取模拟棋盘的合法落子点
   */
  getSimValidMoves(board, color) {
    const validMoves = [];
    
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (board[x][y] === EMPTY) {
          validMoves.push({ x, y });
        }
      }
    }
    
    return validMoves;
  }

  /**
   * 简单计分
   */
  simpleScore(board, aiColor) {
    let aiCount = 0;
    let opponentCount = 0;
    const opponent = aiColor === BLACK ? WHITE : BLACK;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (board[x][y] === aiColor) {
          aiCount++;
        } else if (board[x][y] === opponent) {
          opponentCount++;
        }
      }
    }

    return aiCount - opponentCount;
  }

  /**
   * 设置难度
   */
  setLevel(level) {
    this.level = level;
  }
}

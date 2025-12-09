/**
 * 围棋规则引擎
 * 处理落子、气的计算、提子判定、禁入点检测等核心逻辑
 */

// 棋子状态常量
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

// 棋盘大小
export const BOARD_SIZE = 19;

/**
 * 围棋规则引擎类
 */
export default class GoRules {
  constructor(size = BOARD_SIZE) {
    this.size = size;
    this.board = [];
    this.currentPlayer = BLACK;
    this.capturedBlack = 0;  // 黑棋被提子数
    this.capturedWhite = 0;  // 白棋被提子数
    this.lastMove = null;    // 上一步落子位置
    this.koPoint = null;     // 打劫禁入点
    this.moveHistory = [];   // 落子历史记录
    this.boardHistory = [];  // 棋盘状态历史
    
    this.init();
  }

  /**
   * 初始化棋盘
   */
  init() {
    this.board = [];
    for (let i = 0; i < this.size; i++) {
      this.board[i] = [];
      for (let j = 0; j < this.size; j++) {
        this.board[i][j] = EMPTY;
      }
    }
    this.currentPlayer = BLACK;
    this.capturedBlack = 0;
    this.capturedWhite = 0;
    this.lastMove = null;
    this.koPoint = null;
    this.moveHistory = [];
    this.boardHistory = [];
    
    // 保存初始状态
    this.saveBoardState();
  }

  /**
   * 保存当前棋盘状态到历史记录
   */
  saveBoardState() {
    const boardCopy = this.board.map(row => [...row]);
    this.boardHistory.push({
      board: boardCopy,
      currentPlayer: this.currentPlayer,
      capturedBlack: this.capturedBlack,
      capturedWhite: this.capturedWhite,
      koPoint: this.koPoint ? { ...this.koPoint } : null,
      lastMove: this.lastMove ? { ...this.lastMove } : null
    });
  }

  /**
   * 获取对手颜色
   */
  getOpponent(player) {
    return player === BLACK ? WHITE : BLACK;
  }

  /**
   * 检查坐标是否在棋盘内
   */
  isOnBoard(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  /**
   * 获取相邻的四个点
   */
  getNeighbors(x, y) {
    const neighbors = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isOnBoard(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    
    return neighbors;
  }

  /**
   * 获取一个棋子所属的棋块（连通的同色棋子群）
   * 使用广度优先搜索
   */
  getGroup(x, y) {
    const color = this.board[x][y];
    if (color === EMPTY) {
      return { stones: [], liberties: new Set() };
    }

    const stones = [];
    const liberties = new Set();
    const visited = new Set();
    const queue = [{ x, y }];
    
    visited.add(`${x},${y}`);

    while (queue.length > 0) {
      const current = queue.shift();
      stones.push(current);

      const neighbors = this.getNeighbors(current.x, current.y);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        const neighborColor = this.board[neighbor.x][neighbor.y];

        if (neighborColor === EMPTY) {
          liberties.add(key);
        } else if (neighborColor === color && !visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return { stones, liberties };
  }

  /**
   * 计算一个位置的气数
   */
  countLiberties(x, y) {
    const group = this.getGroup(x, y);
    return group.liberties.size;
  }

  /**
   * 移除一个棋块（提子）
   */
  removeGroup(stones) {
    const color = this.board[stones[0].x][stones[0].y];
    
    for (const stone of stones) {
      this.board[stone.x][stone.y] = EMPTY;
    }

    // 更新被提子数
    if (color === BLACK) {
      this.capturedBlack += stones.length;
    } else {
      this.capturedWhite += stones.length;
    }

    return stones.length;
  }

  /**
   * 检查落子是否会导致提子
   * 返回会被提掉的对方棋子
   */
  getCapturedStones(x, y, player) {
    const opponent = this.getOpponent(player);
    const captured = [];
    const neighbors = this.getNeighbors(x, y);

    for (const neighbor of neighbors) {
      if (this.board[neighbor.x][neighbor.y] === opponent) {
        const group = this.getGroup(neighbor.x, neighbor.y);
        if (group.liberties.size === 0) {
          captured.push(...group.stones);
        }
      }
    }

    return captured;
  }

  /**
   * 检查落子后自己是否有气
   */
  hasLibertyAfterMove(x, y, player) {
    const group = this.getGroup(x, y);
    return group.liberties.size > 0;
  }

  /**
   * 检查是否是打劫禁入点
   */
  isKoPoint(x, y) {
    if (!this.koPoint) return false;
    return this.koPoint.x === x && this.koPoint.y === y;
  }

  /**
   * 检查落子是否合法
   */
  isValidMove(x, y, player = this.currentPlayer) {
    // 检查坐标是否在棋盘内
    if (!this.isOnBoard(x, y)) {
      return { valid: false, reason: '超出棋盘范围' };
    }

    // 检查该位置是否已有棋子
    if (this.board[x][y] !== EMPTY) {
      return { valid: false, reason: '该位置已有棋子' };
    }

    // 检查是否是打劫禁入点
    if (this.isKoPoint(x, y)) {
      return { valid: false, reason: '打劫禁入点' };
    }

    // 模拟落子
    this.board[x][y] = player;

    // 检查是否能提掉对方的子
    const captured = this.getCapturedStones(x, y, player);

    // 如果能提子，则落子合法
    if (captured.length > 0) {
      this.board[x][y] = EMPTY;
      return { valid: true, captured };
    }

    // 检查落子后自己是否有气（禁止自杀）
    if (!this.hasLibertyAfterMove(x, y, player)) {
      this.board[x][y] = EMPTY;
      return { valid: false, reason: '禁止自杀' };
    }

    this.board[x][y] = EMPTY;
    return { valid: true, captured: [] };
  }

  /**
   * 执行落子
   */
  makeMove(x, y, player = this.currentPlayer) {
    const validation = this.isValidMove(x, y, player);
    
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // 落子
    this.board[x][y] = player;

    // 提子
    const captured = this.getCapturedStones(x, y, player);
    let capturedCount = 0;
    
    if (captured.length > 0) {
      capturedCount = this.removeGroup(captured);
    }

    // 检查打劫
    this.koPoint = null;
    if (capturedCount === 1) {
      // 如果只提了一个子，检查是否形成打劫
      const myGroup = this.getGroup(x, y);
      if (myGroup.stones.length === 1 && myGroup.liberties.size === 1) {
        // 单子且只有一气，可能是打劫
        const libertyKey = Array.from(myGroup.liberties)[0];
        const [koX, koY] = libertyKey.split(',').map(Number);
        this.koPoint = { x: koX, y: koY };
      }
    }

    // 记录落子
    this.lastMove = { x, y, player };
    this.moveHistory.push({ x, y, player, captured: capturedCount });

    // 切换玩家
    this.currentPlayer = this.getOpponent(player);

    // 保存棋盘状态
    this.saveBoardState();

    return { 
      success: true, 
      captured: capturedCount,
      koPoint: this.koPoint
    };
  }

  /**
   * 悔棋 - 回退到上一步
   */
  undoMove() {
    if (this.boardHistory.length <= 1) {
      return { success: false, reason: '没有可以悔棋的步骤' };
    }

    // 移除当前状态
    this.boardHistory.pop();
    this.moveHistory.pop();

    // 恢复上一步状态
    const prevState = this.boardHistory[this.boardHistory.length - 1];
    this.board = prevState.board.map(row => [...row]);
    this.currentPlayer = prevState.currentPlayer;
    this.capturedBlack = prevState.capturedBlack;
    this.capturedWhite = prevState.capturedWhite;
    this.koPoint = prevState.koPoint ? { ...prevState.koPoint } : null;
    this.lastMove = prevState.lastMove ? { ...prevState.lastMove } : null;

    return { success: true };
  }

  /**
   * 跳过（虚着/Pass）
   */
  pass() {
    const player = this.currentPlayer;
    this.moveHistory.push({ x: -1, y: -1, player, isPass: true });
    this.currentPlayer = this.getOpponent(player);
    this.koPoint = null;
    this.saveBoardState();

    // 检查是否双方都pass（终局）
    const history = this.moveHistory;
    if (history.length >= 2) {
      const lastTwo = history.slice(-2);
      if (lastTwo[0].isPass && lastTwo[1].isPass) {
        return { success: true, gameEnd: true };
      }
    }

    return { success: true, gameEnd: false };
  }

  /**
   * 获取当前棋盘状态
   */
  getBoardState() {
    return {
      board: this.board.map(row => [...row]),
      currentPlayer: this.currentPlayer,
      capturedBlack: this.capturedBlack,
      capturedWhite: this.capturedWhite,
      lastMove: this.lastMove,
      koPoint: this.koPoint,
      moveCount: this.moveHistory.length
    };
  }

  /**
   * 从状态恢复棋局
   */
  loadState(state) {
    this.board = state.board.map(row => [...row]);
    this.currentPlayer = state.currentPlayer;
    this.capturedBlack = state.capturedBlack;
    this.capturedWhite = state.capturedWhite;
    this.lastMove = state.lastMove;
    this.koPoint = state.koPoint;
    this.moveHistory = state.moveHistory || [];
    this.boardHistory = state.boardHistory || [];
  }

  /**
   * 获取所有合法落子点
   */
  getAllValidMoves(player = this.currentPlayer) {
    const validMoves = [];
    
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.isValidMove(x, y, player).valid) {
          validMoves.push({ x, y });
        }
      }
    }
    
    return validMoves;
  }

  /**
   * 简单计算领地（用于终局计算）
   * 返回各方的领地数
   */
  calculateTerritory() {
    const territory = {
      black: 0,
      white: 0,
      neutral: 0
    };

    const visited = new Set();

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.board[x][y] !== EMPTY || visited.has(`${x},${y}`)) {
          continue;
        }

        // 找到这个空点所属的区域
        const region = [];
        const queue = [{ x, y }];
        let touchesBlack = false;
        let touchesWhite = false;

        visited.add(`${x},${y}`);

        while (queue.length > 0) {
          const current = queue.shift();
          region.push(current);

          const neighbors = this.getNeighbors(current.x, current.y);
          for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            const color = this.board[neighbor.x][neighbor.y];

            if (color === BLACK) {
              touchesBlack = true;
            } else if (color === WHITE) {
              touchesWhite = true;
            } else if (!visited.has(key)) {
              visited.add(key);
              queue.push(neighbor);
            }
          }
        }

        // 判断领地归属
        if (touchesBlack && !touchesWhite) {
          territory.black += region.length;
        } else if (touchesWhite && !touchesBlack) {
          territory.white += region.length;
        } else {
          territory.neutral += region.length;
        }
      }
    }

    return territory;
  }

  /**
   * 计算最终得分
   * 使用中国规则：子空皆地
   */
  calculateScore() {
    const territory = this.calculateTerritory();
    
    // 数子
    let blackStones = 0;
    let whiteStones = 0;
    
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.board[x][y] === BLACK) {
          blackStones++;
        } else if (this.board[x][y] === WHITE) {
          whiteStones++;
        }
      }
    }

    // 中国规则：子 + 目
    const blackScore = blackStones + territory.black;
    const whiteScore = whiteStones + territory.white + 7.5; // 贴7.5目

    return {
      black: blackScore,
      white: whiteScore,
      blackStones,
      whiteStones,
      blackTerritory: territory.black,
      whiteTerritory: territory.white,
      winner: blackScore > whiteScore ? BLACK : WHITE,
      margin: Math.abs(blackScore - whiteScore)
    };
  }
}

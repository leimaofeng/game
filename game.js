/**
 * 围棋微信小游戏入口文件
 */

import WeiqiGame from './js/main.js';

// 创建游戏实例
const game = new WeiqiGame();

// 游戏主循环
const loop = () => {
  game.render();
  requestAnimationFrame(loop);
};

// 启动游戏循环
// 注意：由于我们在事件处理中已经调用了render，
// 这里的循环主要用于动画效果（如果需要的话）
// requestAnimationFrame(loop);

// Jest设置文件
// 导入React Testing Library的扩展
import '@testing-library/jest-dom';

// 导入axe-core的Jest匹配器
import 'jest-axe/extend-expect';

// 全局错误处理
console.error = (message) => {
  // 避免测试过程中出现过多错误信息
  if (!message.includes('Jest')) {
    process.stderr.write(`${message}\n`);
  }
};

// 模拟全局fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
  })
);

/**
 * 人生IF线生成器 - 前端入口
 * 以动态导入方式加载模块化代码，保持 HTML 引用与用户体验不变。
 */

(async () => {
    try {
        const { initApp } = await import('./frontend/bootstrap.js');
        initApp();
    } catch (error) {
        console.error('前端模块加载失败:', error);
    }
})();

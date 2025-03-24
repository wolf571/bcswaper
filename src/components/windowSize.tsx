// 计算窗口大小

import { useState, useEffect } from "react";

export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        // 设置窗口大小  
        function handleResize() {
            // 注意：这里使用 window.innerWidth 和 window.innerHeight  
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        // 调用 handleResize 并设置监听器  
        window.addEventListener('resize', handleResize);
        handleResize(); // 初始调用  

        // 清理函数  
        return () => window.removeEventListener('resize', handleResize);
    }, []); // 空依赖数组意味着这个 effect 只在组件挂载和卸载时运行  

    return windowSize;
}
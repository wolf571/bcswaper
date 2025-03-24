/** @type {import('next').NextConfig} */
import createNextIntlPlugin from 'next-intl/plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const copyPlugin = new CopyWebpackPlugin({
    patterns: [
        { from: 'node_modules/monaco-editor/min/vs/', to: 'static/monaco/vs/' },
    ],
});

const nextConfig = {
    reactStrictMode: false,
    // output: 'standalone',
    // output: "export",
    generateBuildId: async () => {
        // This could be anything, using the latest git hash
        return process.env.GIT_HASH || "888888";
    },
    webpack: (config, { isServer }) => {
        // 在配置中添加 copy-webpack-plugin  
        config.plugins.push(copyPlugin);
        return config;
    },
};

const withNextIntl = createNextIntlPlugin();

// export default nextConfig;
export default withNextIntl(nextConfig);
import TerserPlugin from 'terser-webpack-plugin';

const serverConfig = {
  name: 'server',
  entry: './server/ssr.js',
  target: 'node',
  output: {
    filename: 'server.cjs',
  },
  module: {
    rules: [],
  },
  plugins: [],
  experiments: {
    layers: true,
  },
};

const clientConfig = {
  name: 'client',
  dependencies: ['server'],
  target: 'web',
  entry: './client.js',
  output: {
    filename: 'client.js',
  },
  module: {
    rules: [],
  },
  plugins: [],
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            directives: false,
          },
          output: {
            // An internal React regex is being wrongly minified by terser
            ascii_only: true,
          },
        },
      }),
    ],
  },
};

export default [serverConfig, clientConfig];

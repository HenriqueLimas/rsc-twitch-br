import TerserPlugin from 'terser-webpack-plugin';

const clientReferencesMap = new Map();

const serverConfig = {
  name: 'server',
  entry: './index.js',
  target: 'node',
  output: {
    filename: 'server.cjs',
  },
  module: {
    rules: [{
      resource: (value) => /\rsc.js$/,
      layer: 'reactServer'
    }, {
      issuerLayer: 'reactServer',
      resolve: {
        conditionNames: ['react-server', '...']
      }
    }, {
      oneOf: [
        {
          issuerLayer: 'reactServer',
          test: /\.jsx?$/,
          use: [{
            loader: './webpack/rsc-server-loader.js',
            options: {
              clientReferencesMap
            }
          },
            'swc-loader']
        },
        {
          test: /\.jsx?$/,
          use: ['swc-loader']
        }
      ]
    }],
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
    rules: [
      {
        test: /\.jsx?$/,
        use: ['swc-loader']
      }
    ],
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

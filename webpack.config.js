import TerserPlugin from 'terser-webpack-plugin';

const clientReferencesMap = new Map();
const rscLayer = 'reactServer'

const serverConfig = {
  name: 'server',
  entry: './index.js',
  target: 'node',
  output: {
    filename: 'server.cjs',
  },
  module: {
    rules: [{
      resource: (value) =>
        value.includes('rsc.js') ||
        value.includes('pages'),
      layer: rscLayer
    }, {
      issuerLayer: rscLayer,
      resolve: {
        conditionNames: ['react-server', '...']
      }
    }, {
      oneOf: [
        {
          issuerLayer: rscLayer,
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

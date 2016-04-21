const outputDir = "./resources/public/"

const webpack = require("webpack")
require("es6-promise").polyfill()
const LessPluginNpmImport = require('less-plugin-npm-import')
const commonsPlugin = new webpack.optimize.CommonsChunkPlugin({
  name: "commons",
  filename: "js/commons.js"
})

const plugins = [commonsPlugin]

if (process.env.UGLIFY === "true") {
  const uglifyJsPlugin = new webpack.optimize.UglifyJsPlugin({
      compress: {
          warnings: false
      }
  })
  plugins.push(uglifyJsPlugin)
  const prodEnvPlugin = new webpack.DefinePlugin({
      'process.env': {NODE_ENV: '"production"'}
  })
  plugins.push(prodEnvPlugin)
}

module.exports = {
  entry: {
    app: "./web/va/HakemustenArviointiApp.jsx",
    adminApp: "./web/va/HakujenHallintaApp.jsx",
    summaryApp: "./web/va/YhteenvetoApp.jsx",
    paatosApp: "../va-common/web/va/paatos/PaatosApp.jsx",
    login: "./web/va/Login.jsx"
  },
  output: {
    path: outputDir,
    filename: "js/[name].js",
    sourceMapFilename: "js/[name].map.json"
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: /(va-virkailija\/web|va-common\/web|soresu-form\/web)/,
        loader: 'babel'
      },
      {
        test: /\.less$/,
        loader: "style!css!less"
      },
      {
        test: /\.png$/,
        loader: "url-loader",
        query: { mimetype: "image/png" }
      },
      {
        test: /\.gif$/,
        loader: "url-loader",
        query: { mimetype: "image/gif" }
      },
      {
        include: /\.json$/,
        loaders: ["json-loader"]
      }
    ]
  },
  plugins: plugins,
  lessLoader: {
    lessPlugins: [
      new LessPluginNpmImport()
    ]
  }
}

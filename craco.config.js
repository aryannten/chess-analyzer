module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Suppress source map warnings for external libraries in development
      if (env === 'development') {
        // Filter out the existing source-map-loader to prevent chess.js warnings
        webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
          if (rule.enforce === 'pre' && rule.use) {
            rule.use = rule.use.filter(useItem => {
              if (typeof useItem === 'object' && useItem.loader && useItem.loader.includes('source-map-loader')) {
                return false; // Remove the problematic source-map-loader
              }
              return true;
            });
          }
          return rule;
        });
      }

      return webpackConfig;
    },
  },
};
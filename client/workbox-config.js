module.exports = {
  globDirectory: 'build/',
  globPatterns: [
    '**/*.{js,css,html,png,jpg,jpeg,svg,ico,json}'
  ],
  swDest: 'build/service-worker.js',
  swSrc: 'src/service-worker.js',
  injectionPoint: 'self.__WB_MANIFEST'
};




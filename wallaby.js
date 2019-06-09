module.exports = function(wallaby) {

  return {
    files: [
      'tsconfig.json',
      'src/**/*.*',
      'test/**/*.*',
      '!test/**/*.spec.ts',
    ],

    tests: ['test/**/*.spec.ts'],

    env: {
      type: 'node',
      runner: 'node',
    },

    compilers: {
      '**/*.ts': wallaby.compilers.babel()
    },

    testFramework: 'mocha',
  };
};

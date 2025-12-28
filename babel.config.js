export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  plugins: [
    function () {
      return {
        visitor: {
          MetaProperty(path) {
            path.replaceWithSourceString(`({ 
              env: { 
                VITE_TURN_URL: 'stun:stun.l.google.com:19302', 
                VITE_TURN_USERNAME: 'test_user', 
                VITE_TURN_CREDENTIAL: 'test_pass',
                MODE: 'test',
                DEV: true
              },
              url: 'file:///mock/src/file.js'
            })`);
          }
        }
      }
    }
  ]
};
module.exports = {
  apps: [{
    name: 'laser-tracker',
    script: '/opt/laser-tracker/app/server.js',
    env: {
      NODE_ENV: 'production'
    },
    watch: false,
    max_restarts: 10,
    error_file: '/opt/laser-tracker/logs/error.log',
    out_file: '/opt/laser-tracker/logs/out.log'
  }]
};

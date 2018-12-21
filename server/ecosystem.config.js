'use strict';

const ROOTDIR = __dirname;

module.exports = {
  apps : [{
    name: 'SocketIO',
    script: `${ROOTDIR}/services/SocketIO/startup.js`,

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      CONFIG_PATH: `${ROOTDIR}/services/SocketIO/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/socketio.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/SocketIO/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/socketio.log`,
    }
  }, {
    name: 'Chat',
    script: `${ROOTDIR}/services/Chat/startup.js`,

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      CONFIG_PATH: `${ROOTDIR}/services/Chat/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/chat.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/Chat/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/chat.log`,
    }
  }, {
    name: 'Sicbo',
    script: `${ROOTDIR}/services/SicBo/startup.js`,

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      CONFIG_PATH: `${ROOTDIR}/services/SicBo/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/sicbo.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/SicBo/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/sicbo.log`,
    }
  }],
};

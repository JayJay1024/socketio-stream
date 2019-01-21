'use strict';

/**
 * 该文件可以拿到任何你启动pm2的目录下，然后修改以下配置，然后 pm2 start --env production 启动即可
 */

const ROOTDIR = __dirname;  // socketio-stream/server 的绝对路径

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
      CONFIG_PATH: `${ROOTDIR}/services/SocketIO/config.js`,  // 配置文件路径，可自定义，是必须项
      LOG_PATH: `${ROOTDIR}/logs/socketio/log.log`,           // 日志保存路径，可自定义，是必须项
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/SocketIO/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/socketio/log.log`,
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
      LOG_PATH: `${ROOTDIR}/logs/chat/log.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/Chat/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/chat/log.log`,
    }
  }, {
    name: 'Cash',
    script: `${ROOTDIR}/services/Cash/startup.js`,

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      CONFIG_PATH: `${ROOTDIR}/services/Cash/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/cash/log.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/Cash/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/cash/log.log`,
    }
  }, {
    name: 'Bull',
    script: `${ROOTDIR}/services/Bull/startup.js`,

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      CONFIG_PATH: `${ROOTDIR}/services/Bull/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/bull/log.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/Bull/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/bull/log.log`,
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
      LOG_PATH: `${ROOTDIR}/logs/sicbo/log.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/SicBo/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/sicbo/log.log`,
    }
  }, {
    name: 'TrustBetInfo',
    script: `${ROOTDIR}/services/TrustBetInfo/startup.js`,

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      CONFIG_PATH: `${ROOTDIR}/services/TrustBetInfo/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/trustbetinfo/log.log`,
    },
    env_production: {
      NODE_ENV: 'production',
      CONFIG_PATH: `${ROOTDIR}/services/TrustBetInfo/config.js`,
      LOG_PATH: `${ROOTDIR}/logs/trustbetinfo/log.log`,
    }
  }],
};

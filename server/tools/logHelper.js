'use strict';

const log4js = require('log4js');

const logPath = process.env.LOG_PATH || './logs/default.log';

log4js.configure({
    appenders: {
      everything: { type: 'file', filename: logPath, maxLogSize: 10485760, backups: 10, compress: true }
    },
    categories: {
      default: { appenders: [ 'everything' ], level: 'debug'}
    }
  });
    
const logger = log4js.getLogger();
  
module.exports = logger;
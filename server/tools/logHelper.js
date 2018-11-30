'use strict';

const log4js = require('log4js');

log4js.configure({
    appenders: {
      everything: { type: 'file', filename: './logs/output.log', maxLogSize: 10485760, backups: 10, compress: true }
    },
    categories: {
      default: { appenders: [ 'everything' ], level: 'debug'}
    }
  });
    
const logger = log4js.getLogger();
  
module.exports = logger;
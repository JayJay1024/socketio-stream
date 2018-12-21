'use strict';

const configPath = process.env.CONFIG_PATH || './config.js';

const Ioc            = require('../../tools/Ioc')
,config              = require(configPath)
,log                 = require('../../tools/logHelper')
,redis               = require('../../tools/redis')
,SicBoMonitorCache   = require('./SicBoMonitorCache')
,SicBoMonitorService = require('./SicBoMonitorService')

const ioc = Ioc.createIoc({
    log: log,
    redis: redis,
    config: config
});

Ioc.register('SicBoMonitorCache', SicBoMonitorCache, 'config', 'log', 'redis');
Ioc.register('SicBoMonitorService', SicBoMonitorService, 'config', 'log', 'SicBoMonitorCache');

function run() {
    var _SicBoMonitorService = ioc.get('SicBoMonitorService');
    _SicBoMonitorService.start();
}

run();

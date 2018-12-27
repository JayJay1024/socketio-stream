'use strict';

const configPath = process.env.CONFIG_PATH;

const Ioc           = require('../../tools/Ioc')
,config             = require(configPath)
,log                = require('../../tools/logHelper')
,redis              = require('../../tools/redis')
,ChatMonitorCache   = require('./ChatMonitorCache')
,ChatMonitorService = require('./ChatMonitorService')

const ioc = Ioc.createIoc({
    log: log,
    redis: redis,
    config: config
});

Ioc.register('ChatMonitorCache', ChatMonitorCache, 'config', 'log', 'redis');
Ioc.register('ChatMonitorService', ChatMonitorService, 'config', 'log', 'ChatMonitorCache');

function run() {
    var _ChatMonitorService = ioc.get('ChatMonitorService');
    _ChatMonitorService.start();
}

run();

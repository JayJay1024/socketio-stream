'use strict';

const configPath = process.env.CONFIG_PATH;

const Ioc           = require('../../tools/Ioc')
,config             = require(configPath)
,log                = require('../../tools/logHelper')
,redis              = require('../../tools/redis')
,CashMonitorCache   = require('./CashMonitorCache')
,CashMonitorService = require('./CashMonitorService')

const ioc = Ioc.createIoc({
    log: log,
    redis: redis,
    config: config
});

Ioc.register('CashMonitorCache', CashMonitorCache, 'config', 'log', 'redis');
Ioc.register('CashMonitorService', CashMonitorService, 'config', 'log', 'CashMonitorCache');

function run() {
    var _CashMonitorService = ioc.get('CashMonitorService');
    _CashMonitorService.start();
}

run();

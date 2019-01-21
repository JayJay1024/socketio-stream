'use strict';

const configPath = process.env.CONFIG_PATH;

const Ioc           = require('../../tools/Ioc')
,config             = require(configPath)
,log                = require('../../tools/logHelper')
,redis              = require('../../tools/redis')
,BullMonitorCache   = require('./BullMonitorCache')
,BullMonitorService = require('./BullMonitorService')

const ioc = Ioc.createIoc({
    log: log,
    redis: redis,
    config: config
});

Ioc.register('BullMonitorCache', BullMonitorCache, 'config', 'log', 'redis');
Ioc.register('BullMonitorService', BullMonitorService, 'config', 'log', 'BullMonitorCache');

function run() {
    var _BullMonitorService = ioc.get('BullMonitorService');
    _BullMonitorService.start();
}

run();

'use strict';

const configPath = process.env.CONFIG_PATH;

const Ioc           = require('../../tools/Ioc')
,config             = require(configPath)
,log                = require('../../tools/logHelper')
,redis              = require('../../tools/redis')
,TrustBetInfoCache   = require('./TrustBetInfoCache')
,TrustBetInfoService = require('./TrustBetInfoService')

const ioc = Ioc.createIoc({
    log: log,
    redis: redis,
    config: config
});

Ioc.register('TrustBetInfoCache', TrustBetInfoCache, 'config', 'log', 'redis');
Ioc.register('TrustBetInfoService', TrustBetInfoService, 'config', 'log', 'TrustBetInfoCache');

function run() {
    var _TrustBetInfoService = ioc.get('TrustBetInfoService');
    _TrustBetInfoService.start();
}

run();

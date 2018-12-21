'use strict';

const configPath = process.env.CONFIG_PATH || './config.js';

const Ioc           = require('../../tools/Ioc')
,config             = require(configPath)
,log                = require('../../tools/logHelper')
,redis              = require('../../tools/redis')
,SocketIOCache      = require('./SocketIOCache')
,SocketIOService    = require('./SocketIOService')

const ioc = Ioc.createIoc({
    log: log,
    redis: redis,
    config: config
});

Ioc.register('SocketIOCache', SocketIOCache, 'config', 'log', 'redis');
Ioc.register('SocketIOService', SocketIOService, 'config', 'log', 'redis', 'SocketIOCache');

function run() {
    var _SocketIOService = ioc.get('SocketIOService');
    _SocketIOService.start();
}

run();

'use strict';

const Ioc = require('./tools/Ioc')
,log = require('./tools/logHelper')
,conf = require('./config/sicbo-push.conf')
,CacheService = require('./services/CacheService')
,MonitoringService = require('./services/MonitoringService')
,SocketIO = require('./services/SocketIO');

const ioc = Ioc.createIoc({log:log, conf: conf});
Ioc.register('CacheService', CacheService, 'conf', 'log');
Ioc.register('MonitoringService', MonitoringService, 'conf', 'log', 'CacheService');
Ioc.register('SocketIO', SocketIO, 'conf', 'log', 'CacheService', 'MonitoringService');


function run() {
    var svc = ioc.get('MonitoringService');
    var soc = ioc.get('SocketIO');
    svc.start();
    soc.init();
}

run();

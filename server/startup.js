'use strict';

const Ioc = require('./tools/Ioc')
,log = require('./tools/logHelper')
,conf = require('./config/sicbo-push.conf')
,CacheService = require('./services/CacheService')
,CacheChatService = require('./services/CacheChatService')
,CommonService = require('./services/CommonService')
,MonitoringService = require('./services/MonitoringService')
,MonitorChatService = require('./services/MonitorChatService')
,SocketIO = require('./services/SocketIO');

const ioc = Ioc.createIoc({log:log, conf: conf});
Ioc.register('CacheService', CacheService, 'conf', 'log');
Ioc.register('CacheChatService', CacheChatService, 'conf', 'log');
Ioc.register('MonitoringService', MonitoringService, 'conf', 'log', 'CacheService');
Ioc.register('MonitorChatService', MonitorChatService, 'conf', 'log', 'CacheChatService');
Ioc.register('CommonService', CommonService, 'conf', 'log');
Ioc.register('SocketIO', SocketIO, 'conf', 'log', 'CacheService', 'CacheChatService', 'CommonService', 'MonitoringService', 'MonitorChatService');


function run() {
    var svc = ioc.get('MonitoringService');
    var svcChat = ioc.get('MonitorChatService');
    var soc = ioc.get('SocketIO');
    svc.start();
    svcChat.start();
    soc.start();
}

run();

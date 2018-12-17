'use strict';

const redis = require('ioredis');

class CacheChatService {
    constructor(conf, log) {
        this.log          = log;
        this.gameContract = 'trustbetchat';
        this.client       = new redis(conf.redisPort, conf.redisHost);

        this.client.on("error", function (err) {
            this.log.error('redis error on chat cache:',err);
        });
    }

    async addChat(data) {
        try {
            if ( data && data.player && data.quantity && data.memo && data.block_time ) {
                let _player   = data.player;
                let _quantity = data.quantity.split(' ');
                let _today    = Math.floor(Date.now()/(1000 * 86400));

                let _keyDailyRank   = `r:${_today}`;                    // 日排行榜
                let _keyGameChats   = `chat:${this.gameContract}`;      // 所有玩家的记录
                let _keyPlayerChats = `player:${_player}`;              // 每个玩家的记录

                let _data  = JSON.stringify(data);
                let _retry = Math.floor(Date.now() / 1000) + 5;

                while(Date.now() / 1000 < _retry) {
                    // 已保存的聊天消息不需要再保存
                    this.client.watch(_keyGameChats, _keyPlayerChats);
                    let _existGame   = await this.client.zrank(_keyGameChats, _data) > 0;
                    let _existPlayer = await this.client.zrank(_keyPlayerChats, _data) > 0;
                    if (_existGame || _existPlayer) {
                        this.client.unwatch();
                        return false;
                    }

                    this.client.multi({ pipeline: false });

                    this.client.zadd(_keyGameChats, 0, _data);
                    this.client.zadd(_keyPlayerChats, 0, _data);
                    this.client.zincrby(_keyDailyRank, parseFloat(_quantity[0]), _player);

                    this.client.expire(_keyDailyRank, 60*60*72);    // 日排行榜保留72小时
                    this.client.expire(_keyGameChats, 60*60*48);    // 聊天记录保留48小时
                    this.client.expire(_keyPlayerChats, 60*60*48);  // 聊天记录保留48小时

                    let _ret = await this.client.exec();
                    if ( _ret ) {
                        this.log.info('add chat success: ', data);
                        return true;
                    }
                }
            } else {
                this.log.error('add chat but data format error, data: ', data);
            }

            return false;
        } catch(err) {
            this.log.error('add chat fail: ', err);
            return false;
        }
    }

    async addResult(data) {
        try {
            if (data) {
                let _today = Math.floor(Date.now()/(1000 * 86400));

                let _keyChatResult = `results:${this.gameContract}`;
                let _data          = JSON.stringify(data);
                let _retry         = Math.floor(Date.now() / 1000) + 5;

                while(Date.now() / 1000 < _retry) {
                    this.client.watch(_keyChatResult);

                    let _existResult = await this.client.zrank(_keyChatResult, _data) > 0;
                    if (_existResult) {
                        this.client.unwatch();
                        return false;
                    }

                    this.client.multi({ pipeline: false });
                    this.client.zadd(_keyChatResult, _today, _data);
                    this.client.expire(_keyChatResult, 60*60*24*7);  // 中奖记录保留7天

                    let _ret = await this.client.exec();
                    if ( _ret ) {
                        this.log.info('add chat result success: ', data);
                        return true;
                    }
                }
            } else {
                this.log.error('add chat result but data format error, data: ', data);
            }

            return false;
        } catch(err) {
            this.log.error('add chat result fail: ', err);
            return false;
        }
    }

    async getChats(key) {
        try {
            let _result = await this.client.zrevrange(key, 0, 19);
            return _result;
        } catch(err) {
            this.log.error('get chats fail: ', err);
            return [];
        }
    }

    async getResults() {
        try {
            let _key = `results:${this.gameContract}`;
            let _ret = await this.client.zrevrange(_key, 0, 6, 'WITHSCORES');  // 获取最近7天的
            let _len = _ret.length;

            if ( _len % 2 === 0 ) {
                let _results = [];

                for ( let i = 0; i < _len; i++ ) {
                    if ( i % 2 ) {
                        _results[_results.length - 1].day = _ret[i];
                    } else {
                        _results.push( {result: _ret[i]} );
                    }
                }

                return _results;
            }

            return [];
        } catch(err) {
            this.log.error('get results fail: ', err);
            return [];
        }
    }
}

module.exports = CacheChatService;

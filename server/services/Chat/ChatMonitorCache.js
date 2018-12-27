'use strict';

class ChatMonitorCache {
    constructor(config, log, redis) {
        this.log          = log;
        this.redis        = {
            // sub: redis.redisSub,
            pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.gameContract = config.chatContract;
    }

    async addChat(data) {
        try {
            this.redis.pub.publish('NewChat', JSON.stringify(data));

            if ( data && data.player && data.quantity && data.block_time ) {
                let _player   = data.player;
                let _quantity = data.quantity.split(' ');
                let _today    = Math.floor(Date.now()/(1000 * 86400));
                let _txtime   = Math.floor((new Date(data.block_time)).getTime()/1000);

                let _keyDailyRank   = `r:${_today}`;                    // 日排行榜
                let _keyGameChats   = `chat:${this.gameContract}`;      // 所有玩家的记录
                let _keyPlayerChats = `player:${_player}`;              // 每个玩家的记录

                let _data  = JSON.stringify(data);
                let _retry = Math.floor(Date.now() / 1000) + 5;

                while(Date.now() / 1000 < _retry) {
                    // 已保存的聊天消息不需要再保存
                    this.redis.client.watch(_keyGameChats, _keyPlayerChats);
                    let _existGame   = await this.redis.client.zrank(_keyGameChats, _data) > 0;
                    let _existPlayer = await this.redis.client.zrank(_keyPlayerChats, _data) > 0;
                    if (_existGame || _existPlayer) {
                        this.redis.client.unwatch();
                        return false;
                    }

                    this.redis.client.multi({ pipeline: false });

                    this.redis.client.zadd(_keyGameChats, _txtime, _data);
                    this.redis.client.zadd(_keyPlayerChats, _txtime, _data);
                    this.redis.client.zincrby(_keyDailyRank, parseFloat(_quantity[0]), _player);

                    this.redis.client.expire(_keyDailyRank, 60*60*72);                      // 日排行榜保留72小时
                    this.redis.client.zremrangebyscore(_keyGameChats, 0, _txtime-2*86400);    // 聊天记录保留48小时
                    this.redis.client.zremrangebyscore(_keyPlayerChats, 0, _txtime-2*86400);  // 聊天记录保留48小时

                    let _ret = await this.redis.client.exec();
                    if ( _ret ) {
                        this.log.info('add chat success: ', _data);
                        return true;
                    }
                }
            } else {
                this.log.error('add chat but data format error, data: ', data);
            }

            this.log.debug('chat data not save: ', data);
            return false;
        } catch(err) {
            this.log.error('add chat fail: ', err);
            return false;
        }
    }

    async addResult(data) {
        try {
            this.redis.pub.publish('NewChatResult', JSON.stringify(data));

            if (data && data.block_time && data.hour) {
                let _hour   = data.hour * 1;

                let _keyChatResult = `results:${this.gameContract}`;
                let _data          = JSON.stringify(data);
                let _retry         = Math.floor(Date.now() / 1000) + 5;

                while(Date.now() / 1000 < _retry) {
                    this.redis.client.watch(_keyChatResult);

                    let _existResult = await this.redis.client.zrank(_keyChatResult, _data) > 0;
                    if (_existResult) {
                        this.redis.client.unwatch();
                        return false;
                    }

                    this.redis.client.multi({ pipeline: false });
                    this.redis.client.zadd(_keyChatResult, _hour, _data);
                    this.redis.client.zremrangebyscore(_keyChatResult, 0, _hour-7*24);  // 中奖记录保留7天

                    let _ret = await this.redis.client.exec();
                    if ( _ret ) {
                        this.log.info('add chat result success: ', _data);
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
}

module.exports = ChatMonitorCache;

'use strict';

class SocketIOCache {
    constructor(config, log, redis) {
        this.log           = log;
        this.redis         = {
            // sub: redis.redisSub,
            // pub: redis.redisPub,
            client: redis.redisClient,
        };

        this.mineContract  = config.mineContract;
        this.chatContract  = config.chatContract;
        this.sicboContract = config.sicboContract;
    }

    async getEosDailyRank() {
        try {
            const dailyRank = `r:${Math.floor(Date.now()/(1000 * 86400))}`;
            const result = await this.redis.client.zrevrange(dailyRank, 0, 9, 'WITHSCORES');
            const len = result.length;

            if ( len % 2 === 0 ) {
                let rank = [];

                for ( let i = 0; i < len; i++ ) {
                    if ( i % 2 ) {
                        rank[rank.length - 1].balance = result[i];
                    } else {
                        rank.push( {name: result[i]} );
                    }
                }

                return rank;
            } else {
                return [];
            }
        } catch(err) {
            this.log.error('get EOS daily rank', err);
        }     
    }

    async getSicRecords(accout) {
        try {
            const aKey = `a:${accout}`;
            const result = await this.redis.client.zrevrange(aKey, 0, 19);
            return result;
        } catch(err) {
            this.log.error('geteosDailyRank', err);
        }
    }

    async getChats(key, params=null) {
        try {
            let _result = [];

            if ( params && params.startt && params.records ) {
                let _min = 0, _max = params.startt * 1;
                let _offset = 0, _count = params.records * 1;
                _result = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);
            }

            return _result;
        } catch(err) {
            this.log.error('get chats fail: ', err);
            return [];
        }
    }

    async getChatResults() {
        try {
            let _key = `results:${this.chatContract}`;
            let _ret = await this.redis.client.zrevrange(_key, 0, 6, 'WITHSCORES');  // 获取最近7天的
            let _len = _ret.length;

            if ( _len % 2 === 0 ) {
                let _results = [];

                for ( let i = 0; i < _len; i++ ) {
                    if ( i % 2 ) {
                        // _results[_results.length - 1].day = _ret[i];
                    } else {
                        _results.push(_ret[i]);
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

module.exports = SocketIOCache;

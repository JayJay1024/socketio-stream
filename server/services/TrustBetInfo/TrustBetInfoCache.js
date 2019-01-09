'use strict';

class TrustBetInfoCache {
    constructor( config, log, redis ) {
        this.log          = log;
        this.redis        = {
            // sub: redis.redisSub,
            pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.gameContract = config.infoContract;
    }

    async addTopnRes(data) {
        try {
            let _period = data.period;
            let _keyTopnRes = `tr:${this.gameContract}`;

            let _data  = JSON.stringify(data);
            let _retry = Math.floor(Date.now() / 1000) + 5;

            while (Date.now() / 1000 < _retry) {
                this.redis.client.watch(_keyTopnRes);
                let _exist = await this.redis.client.zrank(_keyTopnRes, _data) > 0;
                if (_exist) {
                    this.redis.client.unwatch();
                    return false;
                }

                this.redis.pub.publish('NewTopnRes', _data);

                this.redis.client.multi({ pipeline: false });
                this.redis.client.zadd(_keyTopnRes, _period, _data);
                this.redis.client.zremrangebyscore(_keyTopnRes, 0, _period-48);    // 删除48小时外的记录

                let _ret = await this.redis.client.exec();
                if (_ret) {
                    this.log.info('add topn result success: ', _data);
                    return true;
                }
            }

            this.log.info('add topn result data not save:', data);
            return false;
        } catch(err) {
            this.log.error('catch error when add topn result:', err);
            return false;
        }
    }

    async pubNewestTopnRes(data) {
        let _data = JSON.stringify(data);
        this.redis.pub.publish('NewestTopnRes', _data);
    }
}

module.exports = TrustBetInfoCache;

'use strict';

class SocketIOCache {
    constructor(config, log, redis) {
        this.log           = log;
        this.redis         = {
            // sub: redis.redisSub,
            // pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.redisRecsMax  = 999999999999999;

        this.mineContract  = config.mineContract;
        this.chatContract  = config.chatContract;
        this.sicboContract = config.sicboContract;
    }

    async getEosDailyRank() {
        let _result = [];
        try {
            let _key = `r:${Math.floor(Date.now()/(1000 * 86400))}`;
            let _data = await this.redis.client.zrevrange(_key, 0, 9, 'WITHSCORES');

            for ( let i = 0; i < _data.length; i++ ) {
                if ( i % 2 ) {
                    _result[_result.length - 1].balance = _data[i];
                } else {
                    _result.push( {name: _data[i]} );
                }
            }
        } catch(err) {
            this.log.error('get eos daily rank', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getSicRecords(accout) {
        let _result = []
        try {
            let _key = `a:${accout}`;
            _result = await this.redis.client.zrevrange(_key, 0, 19);
        } catch(err) {
            this.log.error('get sicbo records', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getChats(key, params=null) {
        let _result = {};
        try {
            if ( params && params.startt && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data  = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);

                if ( _data.length ) {
                    // let _max_r = _data[0]; _max_r = JSON.parse(_max_r);
                    // let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zcount(key, _max+1, this.redisRecsMax);
                    let _before = await this.redis.client.zcount(key, _min, _max-1);

                    _result.data   = _data;
                    _result.after  = _after;
                    _result.before = _before;
                }
            }
        } catch(err) {
            this.log.error('get chats fail: ', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getChatResults(key, params=null) {
        let _result = {};
        try {
            if ( params && params.startt && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data   = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);  // 获取最近7天的

                if ( _data.length ) {
                    let _max_r = _data[0]; _max_r = JSON.parse(_max_r);
                    let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zcount(key, _max_r.number+1, this.redisRecsMax);
                    let _before = await this.redis.client.zcount(key, _min, _min_r.number-1);

                    _result.data   = _data;
                    _result.after  = _after;
                    _result.before = _before;
                }
            }
        } catch(err) {
            this.log.error('get results fail: ', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }
}

module.exports = SocketIOCache;

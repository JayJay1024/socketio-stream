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

    async getSicRecords(account) {
        let _result = [];
        try {
            let _key = `a:${account}`;
            _result = await this.redis.client.zrevrange(_key, 0, 19);
        } catch(err) {
            this.log.error('get sicbo records', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    // 水果机下注记录
    async getCashBetList(account) {
        let _result = [];
        try {
            let _key = `cash:${account}`;
            _result = await this.redis.client.zrevrange(_key, 0, 19);
        } catch(err) {
            this.log.error('catch error when get cash bet list:', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getChats(key, params=null) {
        let _result = {
            data: [],
            after: 0,
            before: 0,
        };

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
        let _result = {
            data: [],
            after: -1,
            before: -1,
        };

        try {
            if ( params && (typeof(params.startt) != undefined) && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data   = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);

                if ( _data.length ) {
                    _result.data   = _data;

                    let _max_r = _data[0]; _max_r = JSON.parse(_max_r);
                    let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zrangebyscore(key, _max_r.number+1, this.redisRecsMax, 'LIMIT', _offset, 1);
                    let _before = await this.redis.client.zrevrangebyscore(key, _min_r.number-1, _min, 'LIMIT', _offset, 1);

                    if (_after.length) {
                        _result.after = JSON.parse(_after[0]).number;
                    }
                    if (_before.length) {
                        _result.before = JSON.parse(_before[0]).number;
                    }
                }
            }
        } catch(err) {
            this.log.error('get results fail: ', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getTopnRes(key, params=null) {
        let _result = {
            data: [],
            after: -1,
            before: -1,
        };

        try {
            if ( params && (typeof(params.startt) != undefined) && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);

                if ( _data.length ) {
                    _result.data   = _data;

                    let _max_r = _data[0];              _max_r = JSON.parse(_max_r);
                    let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zrangebyscore(key, _max_r.period+1, this.redisRecsMax, 'LIMIT', _offset, 1);
                    let _before = await this.redis.client.zrevrangebyscore(key, _min_r.period-1, _min, 'LIMIT', _offset, 1);

                    if (_after.length) {
                        _result.after = JSON.parse(_after[0]).period;
                    }
                    if (_before.length) {
                        _result.before = JSON.parse(_before[0]).period;
                    }
                }
            }
        } catch(err) {
            this.log.error('catch error when get topn result:', err);
        }

        _result = JSON.stringify(_result);
        return _result;
    }
}

module.exports = SocketIOCache;

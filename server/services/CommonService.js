'use strict';

const redis = require('ioredis');

class CommonService {
    constructor(conf, log) {
        this.log    = log;
        this.client = new redis(conf.redisPort,conf.redisHost);

        this.client.on("error", function (err) {
            log.error('redis error on common service:',err);
        });
    }

    async getEosDailyRank() {
        try {
            const dailyRank = `r:${Math.floor(Date.now()/(1000 * 86400))}`;
            const result = await this.client.zrevrange(dailyRank, 0, 9, 'WITHSCORES');
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
            this.log.error('geteosDailyRank', err);
        }     
    }
}

module.exports = CommonService;

'use strict';

const Redis      = require('ioredis');
const configPath = process.env.CONFIG_PATH || '';
const Config     = require(configPath);

const sub    = new Redis( Config.redisPort, Config.redisHost );
const pub    = new Redis( Config.redisPort, Config.redisHost );
const client = new Redis( Config.redisPort, Config.redisHost );

sub.on("error", function (err) {
    console.error( 'redis sub handle:', err );
});
pub.on("error", function (err) {
    console.error( 'redis pub handle:', err );
});
client.on("error", function (err) {
    console.error( 'redis client handle:', err );
});

module.exports = {
    redisSub: sub,
    redisPub: pub,
    redisClient: client,
};

'use strict';

const apiUri = 'https://api-kylin.eoslaomao.com';

module.exports = {
    // redis
    redisPort: 6379,
    redisHost: '127.0.0.1',

    // socket.io
    socketioPort: 8080,

    // eos rpc
    // getInfoUrl: apiUri + '/v1/chain/get_info',
    // getblockUrl: apiUri + '/v1/chain/get_block',
    getActionsUrl: apiUri + '/v1/history/get_actions',
    // getTransactionUrl: apiUri + '/v1/history/get_transaction',

    // contract account
    mineContract: 'trustbetmine',
    chatContract: 'trustbetchat',
    sicboContract: 'trustbetgame',
};

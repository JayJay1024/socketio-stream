'use strict';

const apiUri = 'https://api-kylin.eoslaomao.com';
// const apiUri = 'https://api-kylin.eosasia.one';

module.exports = {
    socketioPort: 8080,
    redisPort: 6379,
    redisHost: '127.0.0.1',
    getActionsUrl: apiUri + '/v1/history/get_actions',
    getInfoUrl: apiUri + '/v1/chain/get_info',
    getblockUrl: apiUri + '/v1/chain/get_block',
    getTransactionUrl: apiUri + '/v1/history/get_transaction',

};
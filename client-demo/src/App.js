import React, { Component } from 'react';
import io from 'socket.io-client';
// import logo from './logo.svg';
import './App.css';

const socketSvr = 'http://localhost:8080';
var socketHandle = null;

class App extends Component {
  constructor(props) {
    super(props);

    this.starttime = Math.floor(Date.now()/1000);  // 开始时间，单位：秒
  }

  // 模拟打开游戏页面
  openGame = (e) => {
    e.preventDefault();
    
    // 连接socket.io
    socketHandle = io.connect(socketSvr);
    socketHandle.on('connect', () => {
      console.log( 'socket.io connected' );

      // 连接上后订阅EosDailyRank消息，接收EOS下注日排行榜
      socketHandle.on('EosDailyRank', (data) => {
        console.log( 'eos daily rank: ', data );
      });

      // 连接上后订阅TrustBetList消息，接收平台游戏下注记录
      socketHandle.on('TrustBetList', (data) => {
        console.log( 'trust bet list: ', data );
      });

      // 连接上后订阅MinerTop消息，接收挖矿排行榜
      socketHandle.on('MinerTop', (data) => {
        console.log( 'miner top 20: ', data );
      });

      // 连接后订阅NewBet消息，接收新的trustbetgame的result
      socketHandle.on('NewBet', (data) => {
        // data字段如下：
        // { player: 'aaaaaaaa3333',                       => 玩家
        //   payin: '1.0000 EOS',                          => 下注金额
        //   payout: '0.0000 EOS',                         => 获奖金额
        //   txtime: 1543822106,                           => 下注时间
        //   dice: { dice1: 6, dice2: 3, dice3: 1 },       => 色子点数
        //   payed: 1,                                     => 0: 奖金未支付  1:奖金已支付
        //   uid: '38d9ce31-a9df-4d62-ac46-5f532cc5256d',  => 下注id
        //   detail: '0:10000:0',                          => 下注类型:下注金额:中奖金额
        //   mine: '100.0000 TBT'                          => 挖矿所得
        // }
        console.log( 'new bet: ', data );
      });

      // 连接后订阅NewChat消息，接收 "废话链天" 弹幕
      socketHandle.on('NewChats', (data) => {
        // data.data是包含如下字段的数组：
        // {
        //   player: 'aaaaaaaa2222',                       => 玩家
        //   quantity: '0.1000 EOS',                       => 金额
        //   memo: '梭哈 梭哈',                             =>  弹幕
        //   block_time: '2018-12-14T06:45:41.500'         => 弹幕时间
        // }
        console.log( 'new chat: ', data );
      });

      // 订阅ChatList，接收聊天记录
      socketHandle.on('ChatList', (data) => {
        console.log('chat list: ', data);
        console.log(new Date(this.starttime*1000));

        if ( typeof data === 'string' ) {
          data = JSON.parse(data);
        }

        let test = JSON.parse(data.data[data.data.length-1]);
        this.starttime = Math.floor((new Date(test.block_time)).getTime() / 1000);

        for ( let tmp of data.data ) {
          if ( typeof tmp === 'string' ) {
            tmp = JSON.parse(tmp);
          }
          console.log(tmp);
        }
      });

      // 订阅NewChatResult，接收新的开奖
      socketHandle.on('NewChatResult', (data) => {
        // data数据结构
        // {
        //   "day": 17882,
        //   "result": [{
        //       "player": "aaaaaaaa3333",
        //       "quantity": "12.3456 EOS",
        //       "ticket": 123456
        //     },{
        //       "player": "aaaaaaaa3333",
        //       "quantity": "12.3456 EOS",
        //       "ticket": 123456
        //     },{
        //       "player": "aaaaaaaa3333",
        //       "quantity": "12.3456 EOS",
        //       "ticket": 123456
        //     },{
        //       "player": "aaaaaaaa3333",
        //       "quantity": "12.3456 EOS",
        //       "ticket": 123456
        //     },{
        //       "player": "aaaaaaaa3333",
        //       "quantity": "12.3456 EOS",
        //       "ticket": 123456
        //     },{
        //       "player": "aaaaaaaa3333",
        //       "quantity": "12.3456 EOS",
        //       "ticket": 123456
        //     }
        //   ]
        // }
        console.log('new chat result: ', data);
      });

      // 订阅ChatResultList，接收中奖记录
      socketHandle.on('ChatResultList', (data) => {
        // data.data数据结构
        // ['{
        //   "day":17882,
        //   "result":[{
        //       "player":"aaaaaaaa3333",
        //       "quantity":"12.3456 EOS",
        //       "ticket":123456
        //   },{
        //       "player":"aaaaaaaa3333",
        //       "quantity":"12.3456 EOS",
        //       "ticket":123456
        //   },{
        //       "player":"aaaaaaaa3333",
        //       "quantity":"12.3456 EOS",
        //       "ticket":123456
        //   },{
        //       "player":"aaaaaaaa3333",
        //       "quantity":"12.3456 EOS",
        //       "ticket":123456
        //   },{
        //       "player":"aaaaaaaa3333",
        //       "quantity":"12.3456 EOS",
        //       "ticket":123456
        //   },{
        //       "player":"aaaaaaaa3333",
        //       "quantity":"12.3456 EOS",
        //       "ticket":123456
        //   }],
        //   "block_time":"2018-12-26T06:05:10.000"
        // }']
        console.log('chat result list: ', data);
      });
    });

    socketHandle.on('error', (err) => {
      console.error( 'socket.io error: ', err );
    });
  }

  // 模拟玩家登陆
  playerLogin = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
      // 先订阅PlayerBetList消息，等下发送Login后这里就会收到玩家下注记录
      socketHandle.on('PlayerBetList', (data) => {
        console.log( 'player bet list: ', data );
      });

      // 发送Login通知
      const player = 'aaaaaaaa3333';
      socketHandle.emit('Login', player);
    } else {
      alert( 'open the game first~' );
    }
  }

  // 请求聊天记录
  getChatList = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
        // startt 和 records 这两个参数名是固定的
        let getChatListParams = {
          startt: this.starttime,
          records: 10,                          // 从 startt 时间往后的多少条记录
        }
        socketHandle.emit('getChatList', JSON.stringify(getChatListParams));
    } else {
      alert( 'open the game first~' );
    }
  }

  // 请求中奖记录
  getChatResultList = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
        // startt 和 records 这两个参数名是固定的
        let getChatResultListParams = {
          startt: -1,  // 期数，小于0将从最新的期数返回
          records: 10, // 从 startt 时间往后的多少条记录
        }
        socketHandle.emit('getChatResultList', JSON.stringify(getChatResultListParams));
    } else {
        alert( 'open the game first~' );
    }
  }

  onNewTopnRes = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
      socketHandle.on('NewTopnRes', (data) => {
        if ( typeof data === 'string' ) {
          data = JSON.parse(data);
        }
        if ( typeof data === 'string' ) {
          data = JSON.parse(data);
        }
        // 此时data数据结构
        // {
        //   block_time: "2019-01-06T08:05:42.000",
        //   period: 429633,
        //   eos_bounty: "29.1000 EOS",
        //   winners: [
        //     {player: "sihaitongchu", payin: "20.0000 EOS", payout: "13.8571 EOS"},
        //     {player: "trustbetteam", payin: "12.0000 EOS", payout: "8.3142 EOS"},
        //     {player: "sihai1111334", payin: "10.0000 EOS", payout: "6.9285 EOS"}
        //   ],
        // }
        console.log('NewTopnRes:', data);
      });
      console.log('onNewTopnRes...');
    }
  }

  onTopnResList = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
      socketHandle.on('TopnResList', (data) => {
        if ( typeof data === 'string' ) {
          data = JSON.parse(data);
        }
        // data数据结构
        // {
        //   after: -1,
        //   before: 429631,
        //   data: [
        //       "{"period":429632,"eos_bounty":"50.0000 EOS","winners":[{"player":"contractabcd","payin":"16.0000 EOS","payout":"25.8064 EOS"},{"player":"aaaaaaaa3333","payin":"8.0000 EOS","payout":"12.9032 EOS"},{"player":"aaaaaaaa2222","payin":"7.0000 EOS","payout":"11.2903 EOS"}],"block_time":"2019-01-05T17:24:22.000"}",
        //       "{"period":429632,"eos_bounty":"20.0000 EOS","winners":[{"player":"contractabcd","payin":"16.0000 EOS","payout":"10.3225 EOS"},{"player":"aaaaaaaa3333","payin":"8.0000 EOS","payout":"5.1612 EOS"},{"player":"trustbetinfo","payin":"7.0000 EOS","payout":"4.5161 EOS"}],"block_time":"2019-01-05T17:03:44.500"}",
        //       "{"period":429632,"eos_bounty":"20.0000 EOS","winners":[{"player":"contractabcd","payin":"16.0000 EOS","payout":"10.3225 EOS"},{"player":"aaaaaaaa3333","payin":"8.0000 EOS","payout":"5.1612 EOS"},{"player":"trustbetinfo","payin":"7.0000 EOS","payout":"4.5161 EOS"}],"block_time":"2019-01-05T16:58:40.500"}"
        //   ]
        // }
        console.log('TopnResList 1:', data);
        // JSON.parse(data.data[0])数据结构
        // {
        //   block_time: "2019-01-05T17:24:22.000",  // 区块时间
        //   eos_bounty: "50.0000 EOS",  // 总奖励
        //   period: 429632,  // 小时数，即UTC事件秒数除以3600
        //   winners: [
        //       {   // 排行榜第一名
        //           player: "contractabcd",  // 玩家
        //           payin: "16.0000 EOS",    // 累计投入
        //           payout: "25.8064 EOS"    // 获得奖励
        //       },
        //       {player: "aaaaaaaa3333", payin: "8.0000 EOS", payout: "12.9032 EOS"},  // 排行榜第二名
        //       {player: "aaaaaaaa2222", payin: "7.0000 EOS", payout: "11.2903 EOS"}   // 排行榜第三名
        //   ]
        // }
        console.log('TopnResList 2:', JSON.parse(data.data[0]));
      });
      console.log('onTopnResList...');
    }
  }

  getTopnResList = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
      // startt 和 records 这两个参数名是固定的
      let params = {
        startt: -1,  // 期数，单位小时，即UTC时间秒数除以3600，小于0将从最新的期数返回
        records: 3,  // 从 startt 往后的多少条记录
      }
      socketHandle.emit('getTopnResList', JSON.stringify(params));
    }
  }

  onNewestTopnRes = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
      socketHandle.on('NewestTopnRes', (data) => {
        if ( typeof data === 'string' ) {
          data = JSON.parse(data);
        }
        if ( typeof data === 'string' ) {
          data = JSON.parse(data);
        }
        console.log(data);
      });
      console.log('onNewestTopnRes...');
    }
  }

  getNewestTopnRes = (e) => {
    e.preventDefault();

    if ( socketHandle && socketHandle.connected ) {
      socketHandle.emit('getNewestTopnRes','kk');
    }
  }

  render() {
    return (
      <div className="my-box">
        <button onClick={this.openGame} className='my-btn'>
          Open Game
        </button>
        <button onClick={this.playerLogin} className='my-btn'>
          Player Login
        </button>
        <button onClick={this.getChatList} className='my-btn'>
          Get ChatList
        </button>
        <button onClick={this.getChatResultList} className='my-btn'>
          Get ChatResultList
        </button>
        <h2>EOS排行榜活动奖励：</h2>
        <button className='my-btn' onClick={this.onNewTopnRes}>
          订阅EOS排行榜活动奖励发放通知
        </button>
        <button className='my-btn' onClick={this.onTopnResList}>
          订阅EOS排行榜活动奖励发放记录通知
        </button>
        <button className='my-btn' onClick={this.getTopnResList}>
          获取EOS排行榜活动奖励发放记录
        </button>
        <button className='my-btn' onClick={this.onNewestTopnRes}>
          订阅EOS排行榜实时信息通知
        </button>
        <button className='my-btn' onClick={this.getNewestTopnRes}>
          获取EOS排行榜实时信息
        </button>
      </div>
    );
  }

  componentWillUnmount = () => {
    // 退出的时候，应该close该socket.io
    if ( socketHandle && socketHandle.connected ) {
      console.log( 'close socket.io' );
      socketHandle.close();
    }
  }
}

export default App;

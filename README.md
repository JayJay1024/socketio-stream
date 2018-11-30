## 基于socket.io的流推送

#### Ubuntu环境安装NodeJs([其他环境安装](https://nodejs.org/en/download/package-manager/))
```
$ curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
$ sudo apt-get install -y nodejs
```

#### 安装pm2
`pm2`可以管理`nodejs`进程，安装完`nodejs`后，可以使用`npm`来安装`pm2`
```
$ npm install pm2 -g
```

#### [Server](./server)

#### [Client Demo](./client-demo)

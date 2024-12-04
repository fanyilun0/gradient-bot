# Gradient network 挂机脚本

> Thanks for author https://github.com/web3bothub for the repo https://github.com/web3bothub/gradient-bot

- 项目地址：https://app.gradient.network/signup?code=DFEC69
- 购买代理IP：https://app.proxy-cheap.com/r/xED8SX
- 购买代理IP：https://travchisproxies.com/billing/aff.php?aff=1207
- 使用文档：-
- discord: https://discord.gg/YytbFdFcYN

## usage
1. install Chrome and ChromeDriver
2. `git clone https://github.com/fanyilun0/gradient-bot.git`
3. `cd gradient-bot`
4. `npm install -g pm2 && npm install`
5. modify file `ecosystem.config.js` with your own account and proxy
6. `pm2 start ecosystem.config.js`

### install Chrome
```shell
# 下载并添加 Google 的签名密钥
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -

# 添加 Google Chrome 仓库
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# 更新包列表
apt update

# 安装依赖
apt install -y wget curl unzip xvfb libxi6 libgconf-2-4

# 安装 Google Chrome
apt install -y google-chrome-stable

# 安装 ChromeDriver
apt install -y chromium-chromedriver

# 验证安装
google-chrome --version
chromedriver --version

chmod +x /usr/bin/google-chrome
chmod +x /usr/bin/chromedriver
```

### install ChromeDriver
```shell
# 创建临时目录
mkdir -p /tmp/chromedriver
cd /tmp/chromedriver

# 获取最新的 ChromeDriver 版本
CHROME_VERSION=$(google-chrome --version | cut -d ' ' -f3)
CHROME_MAJOR_VERSION=$(echo $CHROME_VERSION | cut -d '.' -f1)

# 下载对应版本的 ChromeDriver
wget https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/$CHROME_VERSION/linux64/chromedriver-linux64.zip

# 解压
unzip chromedriver-linux64.zip

# 移动到正确的位置
mv chromedriver-linux64/chromedriver /usr/local/bin/

# 设置执行权限
chmod +x /usr/local/bin/chromedriver

# 清理临时文件
cd ~
rm -rf /tmp/chromedriver

# 验证安装
chromedriver --version
```

## Note

- **This bot is for educational purposes only.**
- You can just run this bot at your own risk, I'm not responsible for any loss or damage caused by this bot.

## Contribution

Feel free to contribute to this project by creating a pull request.

## Support Me

if you want to support me, you can donate to my address:

- ERC20: `0x0e210c294e412de6998081e472673c2993e7c4ab`
- SOLANA: `21jxmkhYea56d4F9woNTmb4goHk4nuFAcqRH6N9WSenc`

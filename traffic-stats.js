const fs = require('fs').promises;
const path = require('path');
const { sendWebhookMessage } = require("./webhook");

class TrafficStats {
  constructor(user) {
    this.user = user;
    this.bytesReceived = 0;
    this.bytesSent = 0;
    this.startTime = Date.now();
    this.lastSaveTime = Date.now();
    this.statsFile = path.join(__dirname, `traffic_stats_${user}.json`);
  }

  addReceivedBytes(bytes) {
    this.bytesReceived += bytes;
    this.autoSave();
  }

  addSentBytes(bytes) {
    this.bytesSent += bytes;
    this.autoSave();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  async loadStats() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      const stats = JSON.parse(data);
      this.bytesReceived = stats.bytesReceived || 0;
      this.bytesSent = stats.bytesSent || 0;
      console.log(`-> 已加载流量统计数据: ${this.formatBytes(this.bytesReceived + this.bytesSent)}`);
    } catch (error) {
      console.log('-> 没有找到历史流量统计数据,从0开始统计');
    }
  }

  async saveStats() {
    try {
      const stats = {
        bytesReceived: this.bytesReceived,
        bytesSent: this.bytesSent,
        lastUpdate: new Date().toISOString()
      };
      await fs.writeFile(this.statsFile, JSON.stringify(stats, null, 2));
      this.lastSaveTime = Date.now();
    } catch (error) {
      console.error('保存流量统计数据失败:', error);
    }
  }

  async autoSave() {
    // 每5分钟或流量变化超过10MB时保存
    const timeDiff = Date.now() - this.lastSaveTime;
    if (timeDiff > 5 * 60 * 1000) {
      await this.saveStats();
    }
  }

  getFormattedStats() {
    return {
      received: this.formatBytes(this.bytesReceived),
      sent: this.formatBytes(this.bytesSent),
      total: this.formatBytes(this.bytesReceived + this.bytesSent),
      duration: this.formatDuration(Date.now() - this.startTime)
    };
  }
}

async function setupTrafficMonitoring(driver, stats) {
  try {
    const cdpConnection = await driver.createCDPConnection('page');
    await cdpConnection.execute('Network.enable');
    
    cdpConnection.on('Network.responseReceived', (params) => {
      if(params.response.encodedDataLength) {
        stats.addReceivedBytes(params.response.encodedDataLength);
      }
    });
    
    cdpConnection.on('Network.requestWillBeSent', (params) => {
      if(params.request.postData) {
        stats.addSentBytes(params.request.postData.length);
      }
    });
    
    console.log('-> 流量监控已启动');
  } catch (error) {
    console.error('-> 设置流量监控失败:', error);
  }
}

function setupTrafficReporting(stats, reportInterval = 300000) {
  return setInterval(async () => {
    const formatted = stats.getFormattedStats();
    console.log(`流量统计 [${stats.user}]:
      接收: ${formatted.received}
      发送: ${formatted.sent} 
      总计: ${formatted.total}
      运行时长: ${formatted.duration}`);
      
    await sendWebhookMessage(
      `📊 代理流量统计\n接收: ${formatted.received}\n发送: ${formatted.sent}\n总计: ${formatted.total}\n运行时长: ${formatted.duration}`,
      stats.user
    );
    
    await stats.saveStats();
  }, reportInterval);
}

module.exports = {
  TrafficStats,
  setupTrafficMonitoring,
  setupTrafficReporting
}; 

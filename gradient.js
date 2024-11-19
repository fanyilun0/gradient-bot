const { Builder, By, until, Capabilities } = require("selenium-webdriver")
const chrome = require("selenium-webdriver/chrome")
const url = require("url")
const fs = require("fs")
const crypto = require("crypto")
const request = require("request")
const path = require("path")
const FormData = require("form-data")
const proxy = require("selenium-webdriver/proxy")
const proxyChain = require("proxy-chain")
require('console-stamp')(console, {
  format: ':date(yyyy/mm/dd HH:MM:ss.l)'
})
require("dotenv").config()

const extensionId = "caacbgbklghmpodbdafajbgdnegacfmo"
const CRX_URL = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=98.0.4758.102&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc&nacl_arch=x86-64`
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36"

const USER = process.env.APP_USER || ""
const PASSWORD = process.env.APP_PASS || ""
const ALLOW_DEBUG = !!process.env.DEBUG?.length || false
const EXTENSION_FILENAME = "app.crx"
const PROXY = process.env.PROXY || undefined

console.log("-> Starting...")
console.log("-> User:", USER)
console.log("-> Pass:", PASSWORD)
console.log("-> Proxy:", PROXY)
console.log("-> Debug:", ALLOW_DEBUG)

if (!USER || !PASSWORD) {
  console.error("Please set APP_USER and APP_PASS env variables")
  process.exit()
}

if (ALLOW_DEBUG) {
  console.log(
    "-> Debugging is enabled! This will generate a screenshot and console logs on error!"
  )
}

async function downloadExtension(extensionId) {
  const url = CRX_URL.replace(extensionId, extensionId)
  const headers = { "User-Agent": USER_AGENT }

  console.log("-> Downloading extension from:", url)

  // if file exists and modify time is less than 1 day, skip download
  if (fs.existsSync(EXTENSION_FILENAME) && fs.statSync(EXTENSION_FILENAME).mtime > Date.now() - 86400000) {
    console.log("-> Extension already downloaded! skip download...")
    return
  }

  return new Promise((resolve, reject) => {
    request({ url, headers, encoding: null }, (error, response, body) => {
      if (error) {
        console.error("Error downloading extension:", error)
        return reject(error)
      }
      fs.writeFileSync(EXTENSION_FILENAME, body)
      if (ALLOW_DEBUG) {
        const md5 = crypto.createHash("md5").update(body).digest("hex")
        console.log("-> Extension MD5: " + md5)
      }
      resolve()
    })
  })
}

async function takeScreenshot(driver, filename) {
  // if ALLOW_DEBUG is set, taking screenshot
  if (!ALLOW_DEBUG) {
    return
  }
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '');
  const data = await driver.takeScreenshot()
  fs.writeFileSync(`${filename}-${timestamp}.png`, Buffer.from(data, "base64"))
}

async function generateErrorReport(driver) {
  //write dom
  const dom = await driver.findElement(By.css("html")).getAttribute("outerHTML")
  fs.writeFileSync("error.html", dom)

  await takeScreenshot(driver, "error")

  const logs = await driver.manage().logs().get("browser")
  fs.writeFileSync(
    "error.log",
    logs.map((log) => `${log.level.name}: ${log.message}`).join("\n")
  )
}

async function getDriverOptions() {
  const options = new chrome.Options();

  // 1. 核心运行模式设置
  options.addArguments(
    "--headless",                    // 无界面模式运行
    "--disable-gpu",                 // 禁用GPU加速（在headless模式下推荐）
    "--no-sandbox",                  // 禁用沙箱模式（在Docker中必需）
    "--single-process",              // 单进程运行（可以移除，因为可能影响稳定性）
  );

  // 2. 性能优化相关
  options.addArguments(
    "--disable-dev-shm-usage",       // 禁用/dev/shm使用，避免内存不足
    "--disable-renderer-backgrounding", // 防止后台标签节流
    "--disable-background-timer-throttling", // 禁用计时器节流
    "--disable-backgrounding-occluded-windows", // 防止背景窗口节流
    "--disable-low-res-tiling",      // 禁用低分辨率瓦片
    "--memory-pressure-off",         // 关闭内存压力
    "--js-flags=--max-old-space-size=512" // 限制JS内存使用
  );

  // 3. 安全性设置
  options.addArguments(
    "--disable-web-security",        // 禁用同源策略（仅在必要时启用）
    "--ignore-certificate-errors",   // 忽略证书错误
    "--allow-running-insecure-content", // 允许不安全内容（仅在必要时启用）
    `--user-agent=${USER_AGENT}`    // 设置用户代理
  );

  // 4. 禁用不必要的功能（提升性能）
  options.addArguments(
    "--disable-client-side-phishing-detection",
    "--disable-crash-reporter",
    "--disable-infobars",
    "--disable-popup-blocking",
    "--disable-default-apps",
    "--dns-prefetch-disable",
    "--no-first-run",
    "--no-default-browser-check"
  );

  // 5. 窗口设置
  options.addArguments(
    "--window-size=1280,720",        // 设置窗口大小
    // "--start-maximized" 可以移除，因为已经设置了固定窗口大小
  );

  // 6. 连接设置
  options.addArguments(
    "--remote-allow-origins=*"       // 允许远程连接（只需要一次）
  );

  // 7. 可选的性能优化（根据需求启用）
  if (process.env.OPTIMIZE_PERFORMANCE) {
    options.addArguments(
      "--disable-extensions",        // 禁用扩展
      "--disable-sync",             // 禁用同步
      "--disable-translate",        // 禁用翻译
      "--disable-features=NetworkService",
      "--disable-features=VizDisplayCompositor"
    );
  }

  // 8. 缓存设置（可选）
  if (process.env.USE_CACHE) {
    options.addArguments(
      `--disk-cache-dir=${path.join(__dirname, 'cache')}`,
      '--disk-cache-size=104857600' // 100MB 缓存
    );
  }

  return options;
}

async function getProxyIpInfo(driver, proxyUrl) {
  // const url = "https://httpbin.org/ip"
  const url = "https://myip.ipip.net"

  console.log("-> Getting proxy IP info:", proxyUrl)

  try {
    await driver.get(url)
    await driver.wait(until.elementLocated(By.css("body")), 30000)
    const pageText = await driver.findElement(By.css("body")).getText()
    console.log("-> Proxy IP info:", pageText)
  } catch (error) {
    console.error("-> Failed to get proxy IP info:", error)
    throw new Error("Failed to get proxy IP info!")
  }
}

// 添加内存监控
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log('内存使用情况:');
  console.log(`- 堆内存使用: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
  console.log(`- 总堆内存: ${Math.round(used.heapTotal / 1024 / 1024)} MB`);
  console.log(`- 进程总内存: ${Math.round(used.rss / 1024 / 1024)} MB`);
  
  // 监控 Chrome 进程
  const exec = require('child_process').exec;
  exec('ps -o pid,rss,command | grep chrome', (error, stdout, stderr) => {
    if (!error) {
      console.log('Chrome 进程内存使用:');
      console.log(stdout);
    }
  });
}

// 浏览器初始化
async function initializeBrowser(options) {
  console.log("-> Starting browser...");
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build()
    .catch(error => {
      console.error("浏览器启动失败:", error);
      throw error;
    });

  await validateBrowserSession(driver);
  return driver;
}

// 验证浏览器会话
async function validateBrowserSession(driver) {
  try {
    await driver.getSession();
    console.log("-> Browser started successfully!");
  } catch (error) {
    console.error("浏览器会话创建失败:", error);
    throw error;
  }
}

// 设置心跳检测
function setupHeartbeat(driver, cleanup) {
  return setInterval(async () => {
    try {
      await driver.getCurrentUrl();
    } catch (error) {
      console.error("浏览器心跳检测失败:", error);
      clearInterval(heartbeat);
      await cleanup();
      process.exit(1);
    }
  }, 5000);
}

// 登录处理
async function handleLogin(driver) {
  console.log("-> Started! Logging in https://app.gradient.network/...");
  await driver.get("https://app.gradient.network/");
  const selectors = {
    email: '[placeholder="Enter Email"]',
    password: '[type="password"]',
    loginButton: 'button',
    successSelectors: [
      'a[href="/dashboard"]',
      'a[href="/dashboard/setting"]',
      // '.gradient-body',
    ]
  };

  await loginWithCredentials(driver, selectors);
  await validateLoginSuccess(driver, selectors.successSelectors);
}

async function loginWithCredentials(driver, selectors) {
  const { email, password, loginButton } = selectors;
  
  await driver.wait(until.elementLocated(By.css(email)), 30000);
  await driver.wait(until.elementLocated(By.css(password)), 30000);
  await driver.wait(until.elementLocated(By.css(loginButton)), 30000);

  await driver.findElement(By.css(email)).sendKeys(USER);
  await driver.findElement(By.css(password)).sendKeys(PASSWORD);
  await takeScreenshot(driver, "login-input");
  await driver.findElement(By.css(loginButton)).click();
}

// 扩展处理
async function handleExtension(driver, extensionId) {
  console.log("-> Extension opened!");
  await driver.get(`chrome-extension://${extensionId}/popup.html`);
  // take screenshot
  await takeScreenshot(driver, "extension");
  await validateExtension(driver);
  await handleGotItButton(driver);
  await checkRegionAvailability(driver);
  
  const supportStatus = await checkSupportStatus(driver);
  return supportStatus;
}

// 状态监控
function setupStatusMonitoring(driver, cleanup) {
  return setInterval(() => {
    logMemoryUsage();
    monitorBrowserStatus(driver, cleanup);
  }, 30000);
}

async function monitorBrowserStatus(driver, cleanup) {
  try {
    const title = await driver.getTitle();
    console.log(`-> [${USER}] Running...`, title);
    
    if (PROXY) {
      console.log(`-> [${USER}] Running with proxy ${PROXY}...`);
    }
  } catch (error) {
    console.error("Error in monitoring:", error);
    await cleanup();
    process.exit(1);
  }
}

// 清理函数
async function cleanup(driver, intervalId) {
  try {
    if (intervalId) {
      clearInterval(intervalId);
    }

    if (driver) {
      await driver.quit();
    }

    if (PROXY) {
      try {
        await proxyChain.closeAnonymizedProxy(PROXY);
      } catch (proxyError) {
        console.log("-> 代理清理过程中出现错误:", proxyError.message);
      }
    }

    console.log("资源清理完成");
  } catch (error) {
    console.error("清理过程中出现错误:", error);
  }
}

// 主函数
async function main() {
  let driver;
  let intervalId;

  try {
    await downloadExtension(extensionId);
    const options = await getDriverOptions();
    options.addExtensions(path.resolve(__dirname, EXTENSION_FILENAME));

    driver = await initializeBrowser(options);
    const heartbeat = setupHeartbeat(driver, () => cleanup(driver, intervalId));

    if (PROXY) {
      await getProxyIpInfo(driver, PROXY);
    }

    await handleLogin(driver);
    const supportStatus = await handleExtension(driver, extensionId);

    if (supportStatus.includes("Disconnected")) {
      await handleDisconnectedStatus(driver);
      return;
    }

    console.log("-> Connected! Starting rolling...");
    console.log({ support_status: supportStatus });

    intervalId = setupStatusMonitoring(driver, () => cleanup(driver, intervalId));
    setupProcessHandlers(() => cleanup(driver, intervalId));

  } catch (error) {
    console.error("Error occurred:", error);
    console.error(error.stack);
    await cleanup(driver, intervalId);
    process.exit(1);
  }
}

// 进程处理器设置
function setupProcessHandlers(cleanup) {
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await cleanup();
    process.exit(0);
  });
}

// 启动程序
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

async function validateLoginSuccess(driver, successSelectors) {
  console.log("-> 验证登录状态...");
  try {
    await takeScreenshot(driver, "login-success-wait");
    // 等待任意一个成功标识元素出现
    const elements = successSelectors.map(selector =>
      driver.wait(until.elementLocated(By.css(selector)), 60000)
    )
    console.log(elements)
    await Promise.any(
      elements
    );
    await takeScreenshot(driver, "login-success");
    console.log("-> 登录成功!");
  } catch (error) {
    console.error("-> 登录失败:", error);
    await generateErrorReport(driver);
    throw new Error("登录验证失败");
  }
}

async function validateExtension(driver) {
  try {
    await driver.wait(until.elementLocated(By.css("body")), 30000);
    console.log("-> 扩展加载成功!");
  } catch (error) {
    console.error("-> 扩展加载失败:", error);
    throw error;
  }
}

async function handleGotItButton(driver) {
  try {
    await takeScreenshot(driver, "got-it-button");
    const gotItButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'I got it')]")),
      5000
    );
    await gotItButton.click();
    console.log("-> 点击了 'Got it' 按钮");
  } catch (error) {
    console.log("-> 没有找到 'Got it' 按钮，继续执行...");
  }
}

async function checkRegionAvailability(driver) {
  try {
    await takeScreenshot(driver, "region-unavailable");
    const notAvailable = await driver.findElement(
      By.xpath(
        '//*[contains(text(), "Sorry, Gradient is not yet available in your region.")]'
      )
    )
    if (notAvailable) {
      console.error("-> 区域不可用!");
      throw new Error("区域不可用");
    }
  } catch (error) {
    if (error.message === "区域不可用") {
      throw error;
    }
  }
}

async function checkSupportStatus(driver) {
  try {
    await takeScreenshot(driver, "support-status");
    // Helveticae text-[12px] text-theme-gray-60 select-none
    const supportStatus = await driver
      .findElement(By.css(".Helveticae.text-[12px].text-theme-gray-60.select-none"))
      .getText()
    return supportStatus
  } catch (error) {
    console.error("-> 获取支持状态失败:", error);
    throw error;
  }
}

async function handleDisconnectedStatus(driver) {
  console.log("-> 状态: 断开连接");
  await generateErrorReport(driver);
  throw new Error("连接断开");
}

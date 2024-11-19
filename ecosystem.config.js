module.exports = {
  apps: [
    {
      name: "gradient-1",
      script: "app.js",
      env: {
        APP_USER: "user1@example.com",
        APP_PASS: "password1",
        PROXY: "proxy1.example.com:8080"
      }
    },
    {
      name: "gradient-2", 
      script: "app.js",
      env: {
        APP_USER: "user2@example.com",
        APP_PASS: "password2",
        PROXY: "proxy2.example.com:8080"
      }
    }
    // more...
    // pm2 start ecosystem.config.js
  ]
}

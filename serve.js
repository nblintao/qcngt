const { exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 8000;

// 杀死占用端口的进程
function killPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
      // 忽略错误,可能端口没被占用
      resolve();
    });
  });
}

// 启动Python服务器
async function startServer() {
  console.log('清理端口占用...');
  await killPort(PORT);

  console.log(`启动HTTP服务器在 http://localhost:${PORT}`);
  console.log('按 Ctrl+C 停止服务器');

  const server = exec(`cd _site && python3 -m http.server ${PORT}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`错误: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });

  server.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  server.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.kill();
    process.exit();
  });
}

startServer();

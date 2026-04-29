const http = require('http');
const data = JSON.stringify({
  model: 'qwen/qwen2.5-coder-14b',
  messages: [{ role: 'user', content: 'Say hello' }]
});
const options = {
  hostname: '127.0.0.1',
  port: 1234,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(body));
});
req.on('error', (e) => console.error(e));
req.write(data);
req.end();

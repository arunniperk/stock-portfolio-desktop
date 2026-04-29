const fs = require('fs');
const http = require('http');

const content = fs.readFileSync('c:/Projects/code/src/modules.js', 'utf8');
const lines = content.split('\n').slice(0, 500).join('\n'); // Send first 500 lines for analysis

const data = JSON.stringify({
  model: 'qwen/qwen2.5-coder-14b',
  messages: [
    { role: 'system', content: 'You are a senior React developer. Analyze the provided code and suggest how to refactor it to be more modular and maintainable.' },
    { role: 'user', content: 'Here is a portion of my modules.js file:\n\n' + lines }
  ],
  temperature: 0.2
});

const options = {
  hostname: '127.0.0.1',
  port: 1234,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      console.log(response.choices[0].message.content);
    } catch (e) {
      console.error('Error parsing response:', body);
    }
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();

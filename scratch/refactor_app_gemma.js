const fs = require('fs');
const http = require('http');

const content = fs.readFileSync('c:/Projects/code/src/App.js', 'utf8');

const data = JSON.stringify({
  model: 'google/gemma-3-4b',
  messages: [
    { role: 'system', content: 'You are a senior React developer. Refactor the provided code to be more modular. Extract large components into separate functions or files. Provide the FULL refactored code for App.js.' },
    { role: 'user', content: 'Please refactor this App.js file:\n\n' + content }
  ],
  temperature: 0.1
});

const options = {
  hostname: '127.0.0.1',
  port: 1234,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.choices && response.choices[0]) {
        fs.writeFileSync('c:/Projects/code/src/App_refactored.js', response.choices[0].message.content);
        console.log('Refactored code written to src/App_refactored.js');
      } else {
        console.error('Unexpected response:', body);
      }
    } catch (e) {
      console.error('Error parsing response:', body, e);
    }
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();

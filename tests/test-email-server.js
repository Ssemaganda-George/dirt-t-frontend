const http = require('http')

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/send-vendor-email') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      console.log('Vendor email request:', JSON.parse(body))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(3001, () => console.log('Local email test server on port 3001'))
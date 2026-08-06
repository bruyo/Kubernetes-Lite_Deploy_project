const express = require('express')
const client = require('prom-client')
const os = require('os')

const app = express()
const PORT = process.env.PORT || 3000
const registry = new client.Registry()

client.collectDefaultMetrics({ register: registry })

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry]
})

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  registers: [registry]
})

app.use((req, res, next) => {
  const end = httpDuration.startTimer()
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, route: req.path, status: res.statusCode })
    end({ method: req.method, route: req.path })
  })
  next()
})

app.get('/', (req, res) => {
  res.json({
    message: 'K8s-Lite Microservice',
    pod: os.hostname(),
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', pod: os.hostname() })
})

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType)
  res.send(await registry.metrics())
})

app.listen(PORT, () => console.log(`Running on port ${PORT}`))

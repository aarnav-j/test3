const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const apiKeys = new Set();
let sensorData = {
    ir_triggered: false,
    rfid_authorized: false,
    last_updated: null,
    message: "No data received yet"
};

// ==================== ENDPOINTS ====================

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'ESP32 Backend is running',
        endpoints: {
            generateKey: 'GET /api/generate-api-key',
            updateData: 'POST /api/update',
            getReadings: 'GET /api/readings'
        }
    });
});

// Generate API Key for ESP32
app.get('/api/generate-api-key', (req, res) => {
    const newKey = uuidv4();
    apiKeys.add(newKey);
    res.json({ 
        status: 'success', 
        api_key: newKey,
        instruction: 'Use this key in your ESP32 code to send data'
    });
});

// ESP32 sends data here
app.post('/api/update', (req, res) => {
    const { api_key, ir_triggered, rfid_authorized } = req.body;

    // Validate API Key
    if (!api_key || !apiKeys.has(api_key)) {
        return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    // Update sensor data
    sensorData = {
        ir_triggered: Boolean(ir_triggered),
        rfid_authorized: Boolean(rfid_authorized),
        last_updated: new Date().toISOString(),
        message: rfid_authorized 
            ? "Authorized person detected - IR sensor sleeping" 
            : (ir_triggered ? "⚠️ ALERT: Unauthorized intrusion detected!" : "All clear - Monitoring...")
    };

    console.log(`[${sensorData.last_updated}] Data received:`, sensorData);

    res.json({ status: 'success', received: sensorData });
});

// Dashboard fetches data here
app.get('/api/readings', (req, res) => {
    res.json(sensorData);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Generate API Key: GET /api/generate-api-key`);
    console.log(`📥 ESP32 Update: POST /api/update`);
    console.log(`📊 Dashboard Readings: GET /api/readings`);
});

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
        version: '1.2 (No Auth)',
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
    // New ESP32 code sends: { unauthorized_suspect: bool, access_granted: bool }
    // It does NOT send api_key, so we remove the strict check.
    const { api_key, ir_triggered, rfid_authorized, unauthorized_suspect, access_granted } = req.body;

    // Map new ESP32 payload to internal state
    const isIrTriggered = unauthorized_suspect !== undefined ? unauthorized_suspect : (ir_triggered || false);
    const isRfidAuthorized = access_granted !== undefined ? access_granted : (rfid_authorized || false);

    // Update sensor data
    sensorData = {
        ir_triggered: Boolean(isIrTriggered),
        rfid_authorized: Boolean(isRfidAuthorized),
        last_updated: new Date().toISOString(),
        message: isRfidAuthorized
            ? "Authorized person detected - IR sensor sleeping"
            : (isIrTriggered ? "⚠️ ALERT: Unauthorized intrusion detected!" : "All clear - Monitoring...")
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

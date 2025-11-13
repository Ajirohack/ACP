require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = process.env.PORT || 3002;

// --- Database Setup ---
const adapter = new FileSync('db.json');
const db = low(adapter);

// Set database defaults
db.defaults({ instances: [] }).write();

// --- Middleware ---
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- Routes ---

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

/**
 * Registers a new instance or updates an existing one.
 */
app.post('/register', (req, res) => {
    const { instanceId, address, deviceSerial, avdName } = req.body;
    if (!instanceId || !address) {
        return res.status(400).json({ error: 'Missing instanceId or address' });
    }

    const newInstanceData = {
        instanceId,
        address,
        deviceSerial,
        avdName,
        status: 'registered',
        lastSeen: new Date().toISOString()
    };

    const existing = db.get('instances').find({ instanceId: instanceId });

    if (existing.value()) {
        existing.assign(newInstanceData).write();
        console.log(`Instance updated: ${instanceId}`);
    } else {
        db.get('instances').push(newInstanceData).write();
        console.log(`Instance registered: ${instanceId}`);
    }

    res.status(201).json(newInstanceData);
});

/**
 * Gets a list of all registered instances.
 */
app.get('/instances', (req, res) => {
    const instances = db.get('instances').value();
    res.status(200).json(instances);
});

/**
 * Gets the details for a specific instance.
 */
app.get('/instances/:instanceId', (req, res) => {
    const { instanceId } = req.params;
    const instance = db.get('instances').find({ instanceId: instanceId }).value();

    if (instance) {
        res.status(200).json(instance);
    } else {
        res.status(404).json({ error: `Instance with ID '${instanceId}' not found.` });
    }
});

/**
 * De-registers an instance, removing it from the active list.
 */
app.post('/deregister', (req, res) => {
    const { instanceId } = req.body;
    if (!instanceId) {
        return res.status(400).json({ error: 'Missing instanceId' });
    }

    const instance = db.get('instances').find({ instanceId: instanceId }).value();

    if (instance) {
        db.get('instances').remove({ instanceId: instanceId }).write();
        console.log(`Instance de-registered: ${instanceId}`);
        res.status(200).json({ message: `Instance ${instanceId} de-registered successfully.` });
    } else {
        res.status(404).json({ error: `Instance with ID '${instanceId}' not found.` });
    }
});

// --- Server Initialization ---

app.listen(PORT, () => {
    console.log(`Instance Manager listening on port ${PORT}`);
});

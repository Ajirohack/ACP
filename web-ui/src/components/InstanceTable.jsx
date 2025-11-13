import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InstanceControl from './InstanceControl';
import InstanceStatus from './InstanceStatus';

// Create a pre-configured axios instance to communicate with the Gateway
const gatewayClient = axios.create({
    baseURL: import.meta.env.VITE_GATEWAY_URL || '/api',
    headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'secret-key'}`
    }
});

function InstanceTable() {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [startAvd, setStartAvd] = useState('');
    const [startHeadless, setStartHeadless] = useState(false);
    const [startGpu, setStartGpu] = useState('auto');
    const [startNoSnapshot, setStartNoSnapshot] = useState(false);
    const [startMsg, setStartMsg] = useState('');
    const [avds, setAvds] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [statusById, setStatusById] = useState({});

    useEffect(() => {
        const fetchInstances = async () => {
            try {
                setLoading(true);
                const response = await gatewayClient.get('/instances');
                setInstances(response.data);
                setError(null);
            } catch (err) {
                setError(err.response ? err.response.data.error : err.message);
                console.error("Error fetching instances:", err);
            }
            setLoading(false);
        };

        const fetchAvds = async () => {
            try {
                const response = await gatewayClient.get('/avds');
                setAvds(Array.isArray(response.data) ? response.data : (response.data?.avds || []));
            } catch (err) {
                console.warn('AVD fetch failed:', err.response?.data?.error || err.message);
            }
        };

        fetchInstances();
        fetchAvds();
        // Optional: Set up polling to refresh the list periodically
        const interval = setInterval(fetchInstances, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval); // Cleanup on component unmount
    }, []);

    if (loading && instances.length === 0) return <p>Loading instances...</p>;
    if (error) return <p className="text-danger">Error: {error}</p>;

    const notify = (toast) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, ...toast }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const startInstance = async () => {
        try {
            setError(null);
            setStartMsg('');
            const payload = { avdName: startAvd, headless: startHeadless, gpu: startGpu, noSnapshot: startNoSnapshot };
            await gatewayClient.post('/instances/start', payload);
            setStartMsg(`Start requested for '${startAvd}'.`);
            notify({ type: 'success', message: `Start requested for '${startAvd}'` });
        } catch (err) {
            setError(err.response ? err.response.data.error : err.message);
            notify({ type: 'error', message: `Start failed: ${err.response?.data?.error || err.message}` });
        }
    };

    return (
        <div className="table-responsive">
            <div className="card mb-3">
                <div className="card-body">
                    <h6 className="card-title">Start Instance</h6>
                    <div className="row g-2 align-items-center">
                        <div className="col-md-4">
                            {avds.length > 0 ? (
                                <select className="form-select form-select-sm" value={startAvd} onChange={e => setStartAvd(e.target.value)}>
                                    <option value="">Select an AVD…</option>
                                    {avds.map(name => (<option key={name} value={name}>{name}</option>))}
                                </select>
                            ) : (
                                <input className="form-control form-control-sm" placeholder="AVD name (e.g., Pixel_8_API_34)" value={startAvd} onChange={e => setStartAvd(e.target.value)} />
                            )}
                        </div>
                        <div className="col-md-2">
                            <select className="form-select form-select-sm" value={startGpu} onChange={e => setStartGpu(e.target.value)}>
                                <option value="auto">gpu auto</option>
                                <option value="host">gpu host</option>
                                <option value="swiftshader_indirect">swiftshader</option>
                                <option value="off">gpu off</option>
                            </select>
                        </div>
                        <div className="col-md-2 form-check form-check-inline">
                            <input className="form-check-input" type="checkbox" id="startHeadless" checked={startHeadless} onChange={e => setStartHeadless(e.target.checked)} />
                            <label className="form-check-label" htmlFor="startHeadless">Headless</label>
                        </div>
                        <div className="col-md-2 form-check form-check-inline">
                            <input className="form-check-input" type="checkbox" id="startNoSnapshot" checked={startNoSnapshot} onChange={e => setStartNoSnapshot(e.target.checked)} />
                            <label className="form-check-label" htmlFor="startNoSnapshot">No Snapshot</label>
                        </div>
                        <div className="col-md-2 text-end">
                            <button className="btn btn-primary btn-sm" disabled={!startAvd} onClick={startInstance}>Start</button>
                        </div>
                    </div>
                    {startMsg && <div className="mt-2 small text-muted">{startMsg}</div>}
                </div>
            </div>
            {/* Toast notifications */}
            <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1050 }}>
                {toasts.map(t => (
                    <div key={t.id} className={`alert alert-${t.type === 'success' ? 'success' : 'danger'} py-2 px-3 mb-2`} role="alert">
                        {t.message}
                    </div>
                ))}
            </div>
            <table className="table table-striped table-hover">
                <thead className="thead-dark">
                    <tr>
                        <th>Instance ID</th>
                        <th>AVD Name</th>
                        <th>Address</th>
                        <th>Serial</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {instances.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="text-center">No instances found</td>
                        </tr>
                    ) : (
                        instances.map(instance => (
                            <tr key={instance.instanceId}>
                                <td>{instance.instanceId}</td>
                                <td>{instance.avdName || 'N/A'}</td>
                                <td>{instance.address}</td>
                                <td>{instance.deviceSerial || 'N/A'}</td>
                                <td>
                                    <InstanceStatus 
                                        instanceId={instance.instanceId} 
                                        initialStatus={instance.status}
                                        onStatusChange={(id, st) => setStatusById(prev => ({ ...prev, [id]: st }))}
                                    />
                                </td>
                                <td>{new Date(instance.lastSeen).toLocaleString()}</td>
                                <td>
                                    <InstanceControl 
                                        instanceId={instance.instanceId} 
                                        onActionComplete={() => {}} 
                                        onNotify={notify}
                                        disabled={(statusById[instance.instanceId] || instance.status) !== 'running'}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default InstanceTable;

import React, { useState } from 'react';
import axios from 'axios';

// Create a pre-configured axios instance to communicate with the Gateway
const gatewayClient = axios.create({
    baseURL: import.meta.env.VITE_GATEWAY_URL || '/api',
    headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'secret-key'}`
    }
});

function InstanceControl({ instanceId, onActionComplete, onNotify, disabled }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [apkPath, setApkPath] = useState('');
    const [pkgName, setPkgName] = useState('com.android.settings');
    const [activityName, setActivityName] = useState('.Settings');

    const handleLaunchApp = async () => {
        try {
            setLoading(true);
            setError(null);
            await gatewayClient.post(`/instances/${instanceId}/app/launch`, {
                packageName: pkgName,
                activityName
            });
            if (onActionComplete) onActionComplete();
            if (onNotify) onNotify({ type: 'success', message: `Launched ${pkgName}/${activityName} on ${instanceId}` });
        } catch (err) {
            setError(err.response ? err.response.data.error : err.message);
            console.error("Error launching app:", err);
            if (onNotify) onNotify({ type: 'error', message: `Launch failed: ${err.response?.data?.error || err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleTakeScreenshot = async () => {
        try {
            setLoading(true);
            setError(null);
            await gatewayClient.post(`/dispatch/${instanceId}`, { command: 'screenshot', payload: {} });
            if (onActionComplete) onActionComplete();
            if (onNotify) onNotify({ type: 'success', message: `Screenshot captured for ${instanceId}` });
        } catch (err) {
            setError(err.response ? err.response.data.error : err.message);
            console.error("Error taking screenshot:", err);
            if (onNotify) onNotify({ type: 'error', message: `Screenshot failed: ${err.response?.data?.error || err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleInstallApk = async () => {
        try {
            setLoading(true);
            setError(null);
            await gatewayClient.post(`/instances/${instanceId}/apk/install`, { apkPath });
            if (onActionComplete) onActionComplete();
            if (onNotify) onNotify({ type: 'success', message: `APK installed on ${instanceId}` });
        } catch (err) {
            setError(err.response ? err.response.data.error : err.message);
            console.error("Error installing APK:", err);
            if (onNotify) onNotify({ type: 'error', message: `APK install failed: ${err.response?.data?.error || err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleStopInstance = async () => {
        try {
            setLoading(true);
            setError(null);
            await gatewayClient.post(`/instances/${instanceId}/stop`);
            if (onActionComplete) onActionComplete();
            if (onNotify) onNotify({ type: 'success', message: `Stop requested for ${instanceId}` });
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            setError(msg);
            console.error("Error stopping instance:", err);
            const friendly = msg.includes('not found') ? 'Instance not found on Host Adapter. Start it first.' : msg;
            if (onNotify) onNotify({ type: 'error', message: `Stop failed: ${friendly}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="instance-control">
            <div className="btn-group mb-2" role="group">
                <button 
                    className="btn btn-primary btn-sm" 
                    onClick={handleLaunchApp} 
                    disabled={loading || disabled}
                >
                    Launch App
                </button>
                <button 
                    className="btn btn-info btn-sm" 
                    onClick={handleTakeScreenshot} 
                    disabled={loading || disabled}
                >
                    Take Screenshot
                </button>
                <button 
                    className="btn btn-danger btn-sm" 
                    onClick={handleStopInstance} 
                    disabled={loading || disabled}
                >
                    Stop Instance
                </button>
            </div>
            <div className="input-group input-group-sm mb-2">
                <span className="input-group-text">APK</span>
                <input className="form-control" placeholder="/path/to/app.apk" value={apkPath} onChange={e => setApkPath(e.target.value)} disabled={disabled} />
                <button className="btn btn-outline-secondary" disabled={loading || !apkPath || disabled} onClick={handleInstallApk}>Install</button>
            </div>
            <div className="input-group input-group-sm">
                <span className="input-group-text">Package</span>
                <input className="form-control" value={pkgName} onChange={e => setPkgName(e.target.value)} disabled={disabled} />
                <span className="input-group-text">Activity</span>
                <input className="form-control" value={activityName} onChange={e => setActivityName(e.target.value)} disabled={disabled} />
            </div>
            {error && <div className="text-danger mt-2 small">{error}</div>}
        </div>
    );
}

export default InstanceControl;
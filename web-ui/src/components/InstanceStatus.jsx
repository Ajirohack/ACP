import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const gatewayClient = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_URL || '/api',
  headers: { 'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'secret-key'}` }
});

function InstanceStatus({ instanceId, initialStatus, onStatusChange }) {
  const [status, setStatus] = useState(initialStatus || 'unknown');
  const [fetching, setFetching] = useState(false);

  // Track adaptive polling and request cancellation
  const timeoutRef = useRef(null);
  const controllerRef = useRef(null);
  const seenRunningRef = useRef(false);
  const inFlightRef = useRef(false);

  // Compute adaptive polling interval
  const getIntervalMs = (currentStatus) => {
    if (!seenRunningRef.current) {
      // Faster until we see first 'running'
      return 2000;
    }
    if (currentStatus === 'running') {
      // Slow down when running
      return 9000;
    }
    if (currentStatus === 'stopped') {
      // Poll less frequently when stopped
      return 20000;
    }
    // Default moderate polling
    return 4000;
  };

  useEffect(() => {
    let mounted = true;

    const scheduleNext = (nextStatus) => {
      const interval = getIntervalMs(nextStatus);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(fetchStatus, interval);
    };

    const fetchStatus = async () => {
      // If a request is already in-flight, skip starting a new one
      if (inFlightRef.current) {
        scheduleNext(status);
        return;
      }
      controllerRef.current = new AbortController();
      try {
        inFlightRef.current = true;
        setFetching(true);
        const res = await gatewayClient.get(`/instances/${instanceId}/status`, {
          headers: { 'Cache-Control': 'no-cache' },
          params: { t: Date.now() },
          signal: controllerRef.current.signal
        });
        if (!mounted) return;
        const next = res.data?.status || (res.data?.bootCompleted ? 'running' : 'unknown') || 'unknown';
        if (next === 'running') {
          seenRunningRef.current = true;
        }
        setStatus(next);
        if (onStatusChange) onStatusChange(instanceId, next);
        scheduleNext(next);
      } catch (e) {
        if (!mounted) return;
        // Map 404 to 'stopped'
        const statusCode = e?.response?.status;
        const msg = e?.message || '';
        if (msg.includes('ERR_ABORTED') || e?.name === 'CanceledError' || e?.name === 'AbortError') {
          // silent ignore aborted fetches
          scheduleNext(status);
          return;
        }
        const next = statusCode === 404 ? 'stopped' : 'error';
        setStatus(next);
        if (onStatusChange) onStatusChange(instanceId, next);
        scheduleNext(next);
      } finally {
        inFlightRef.current = false;
        if (mounted) setFetching(false);
      }
    };

    fetchStatus();

    return () => {
      mounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [instanceId]);

  const badgeClass = status === 'running' ? 'bg-success' : status === 'stopped' ? 'bg-secondary' : status === 'error' ? 'bg-danger' : 'bg-warning';

  return (
    <div className="d-flex align-items-center gap-2">
      <span className={`badge ${badgeClass}`}>{status}</span>
      {fetching && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />}
    </div>
  );
}

export default InstanceStatus;
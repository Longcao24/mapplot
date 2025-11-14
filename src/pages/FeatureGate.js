import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getFeatureToggle } from '../lib/featureToggles'; // adjust path if your helper lives elsewhere

export default function FeatureGate({ featureName, children }) {
  const [status, setStatus] = useState({ loading: true, allowed: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const allowed = await getFeatureToggle(featureName);
        if (!mounted) return;
        setStatus({ loading: false, allowed: Boolean(allowed) });
      } catch (err) {
        // treat errors as disallowed (fail closed)
        if (!mounted) return;
        console.warn('FeatureGate error:', err);
        setStatus({ loading: false, allowed: false });
      }
    })();
    return () => { mounted = false; };
  }, [featureName]);

  if (status.loading) {
    // keep UI minimal — you can show a spinner instead

    return null;
  }

  if (!status.allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { GOOGLE_ANALYTICS_ID } from '../utils/constants';

// Initialize Google Analytics once
// We use a check to prevent re-initializing if it's already done, 
// though react-ga4 handles this gracefully usually.
// Also check if ID is not the placeholder
if (GOOGLE_ANALYTICS_ID && GOOGLE_ANALYTICS_ID !== 'G-XXXXXXXXXX') {
    ReactGA.initialize(GOOGLE_ANALYTICS_ID);
}

const Analytics = () => {
    const location = useLocation();

    useEffect(() => {
        // Only track if ID is valid
        if (GOOGLE_ANALYTICS_ID && GOOGLE_ANALYTICS_ID !== 'G-XXXXXXXXXX') {
            ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
        }
    }, [location]);

    return null;
};

export default Analytics;

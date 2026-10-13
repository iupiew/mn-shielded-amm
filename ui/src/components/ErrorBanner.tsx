import { useState } from 'react';
import type { AppError } from '../lib/errors';

interface ErrorBannerProps {
  readonly error: AppError;
  readonly onClose: () => void;
}

/**
 * Error banner with a "Show details" toggle revealing the raw message.
 * Mount with `key={error.raw}` so the toggle starts collapsed per error.
 */
export function ErrorBanner({ error, onClose }: ErrorBannerProps) {
  const [showRaw, setShowRaw] = useState(false);
  const canShowDetails = error.raw !== error.message;
  return (
    <div className="banner banner-error" data-testid="banner-error">
      <span className="banner-text">
        <span>{error.message}</span>
        {canShowDetails && (
          <button className="banner-link" onClick={() => setShowRaw((open) => !open)} data-testid="error-details-toggle">
            {showRaw ? 'Hide details' : 'Show details'}
          </button>
        )}
        {canShowDetails && showRaw && (
          <span className="banner-raw mono" data-testid="error-details">
            {error.raw}
          </span>
        )}
      </span>
      <button onClick={onClose} title="Dismiss">
        ✕
      </button>
    </div>
  );
}

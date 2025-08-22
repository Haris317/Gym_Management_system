import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import './Attendance.css';

const QRCodeDisplay = ({ qrSession, className, onClose }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrSession.qrCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = qrSession.qrCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const shareCode = async () => {
    const shareData = {
      title: 'Gym Class QR Code',
      text: `QR Code for ${className?.name || 'class'}: ${qrSession.qrCode}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copying
      copyToClipboard();
    }
  };

  return (
    <div className="qr-code-display">
      <div className="qr-visual">
        <QRCode 
          value={qrSession.qrCode} 
          size={250}
          level="M"
          style={{ background: 'white', padding: '16px' }}
        />
      </div>

      <div className="qr-details">
        <h4>Class: {className?.name || 'N/A'}</h4>
        <p>Time: {qrSession.metadata?.startTime || 'N/A'}</p>
        <p>Expires: {new Date(qrSession.expiresAt).toLocaleString()}</p>
        <p>Scans: {qrSession.usageCount || 0} / {qrSession.maxUsage || 100}</p>
      </div>

      <div className="qr-code-text">
        <p><strong>Manual Entry Code:</strong></p>
        <div className="code-container">
          <code>{qrSession.qrCode}</code>
          <div className="code-actions">
            <button 
              className="copy-code-btn"
              onClick={copyToClipboard}
              disabled={copySuccess}
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button 
              className="share-code-btn"
              onClick={shareCode}
            >
              📤 Share
            </button>
          </div>
        </div>
        <p className="input-help">
          Members can scan the QR code or enter this code manually
        </p>
      </div>

      <div className="qr-instructions">
        <h5>Instructions for Members:</h5>
        <ol>
          <li>Open the gym app and go to Attendance</li>
          <li>Click "Scan QR Code" or "QR Scanner" tab</li>
          <li>Either scan this QR code or click "Enter Code Manually"</li>
          <li>If entering manually, copy and paste the code above</li>
        </ol>
      </div>

      {onClose && (
        <div className="qr-actions">
          <button className="action-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
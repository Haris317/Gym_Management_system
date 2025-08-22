import React, { useState } from 'react';
import { attendanceAPI } from '../../services/api';
import './Attendance.css';

const ManualQREntry = ({ onSuccess, onCancel, onError }) => {
  const [qrCode, setQrCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qrCode.trim()) return;

    try {
      setProcessing(true);
      setError('');

      const response = await attendanceAPI.scanQRCode({
        qrCode: qrCode.trim(),
        scanType: 'checkin',
        location: null // No location for manual entry
      });

      setSuccessResult(response);
      
      if (onSuccess) {
        onSuccess(response);
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to process QR code';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setQrCode(text);
    } catch (err) {
      console.log('Clipboard access denied or not supported');
    }
  };

  // Show success modal if attendance was marked successfully
  if (successResult) {
    return (
      <div className="attendance-success-overlay">
        <div className="attendance-success-modal">
          <div className="success-animation">
            <div className="success-checkmark">
              <div className="check-icon">
                <span className="icon-line line-tip"></span>
                <span className="icon-line line-long"></span>
                <div className="icon-circle"></div>
                <div className="icon-fix"></div>
              </div>
            </div>
          </div>
          
          <div className="success-content">
            <h2 className="success-title">🎉 Attendance Marked!</h2>
            <p className="success-message">Your attendance has been successfully recorded via manual entry</p>
            
            <div className="attendance-details">
              <div className="detail-card">
                <span className="detail-icon">📚</span>
                <div className="detail-info">
                  <span className="detail-label">Class</span>
                  <span className="detail-value">{successResult.data?.className || 'N/A'}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <span className="detail-icon">⏰</span>
                <div className="detail-info">
                  <span className="detail-label">Check-in Time</span>
                  <span className="detail-value">
                    {successResult.data?.scanTime ? new Date(successResult.data.scanTime).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>
              
              <div className="detail-card">
                <span className="detail-icon">✅</span>
                <div className="detail-info">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{successResult.data?.attendance?.status || 'Present'}</span>
                </div>
              </div>
            </div>
            
            <div className="success-tip">
              <span className="tip-icon">🎯</span>
              <span>Perfect! Manual entry completed successfully!</span>
            </div>
            
            <div className="success-actions">
              <button 
                className="btn-primary"
                onClick={onCancel}
              >
                Done
              </button>
              <button 
                className="btn-secondary"
                onClick={() => {
                  setSuccessResult(null);
                  setQrCode('');
                }}
              >
                Enter Another Code
              </button>
            </div>
          </div>
          
          <button 
            className="success-close"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="manual-qr-entry">
      <div className="manual-entry-header">
        <h3>Enter QR Code Manually</h3>
        <p>If you can't scan the QR code, enter it manually below:</p>
      </div>

      <form onSubmit={handleSubmit} className="manual-entry-form">
        <div className="form-group">
          <label htmlFor="qrCodeInput">QR Code:</label>
          <div className="input-with-paste">
            <textarea
              id="qrCodeInput"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="Paste or type the QR code here..."
              required
              rows={4}
              className="manual-code-input"
            />
            <button 
              type="button" 
              className="paste-btn"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              📋 Paste
            </button>
          </div>
          <small className="input-help">
            Ask your trainer for the QR code text if scanning doesn't work
          </small>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="manual-entry-actions">
          <button 
            type="submit" 
            className="action-btn primary"
            disabled={!qrCode.trim() || processing}
          >
            {processing ? 'Processing...' : 'Mark Attendance'}
          </button>
          {onCancel && (
            <button 
              type="button" 
              className="action-btn secondary"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="manual-entry-tips">
        <h5>💡 Tips:</h5>
        <ul>
          <li>Make sure you copy the entire QR code text</li>
          <li>The code is usually a long string of letters and numbers</li>
          <li>Ask your trainer to share the code via message if needed</li>
          <li>You must be enrolled in the class to mark attendance</li>
        </ul>
      </div>
    </div>
  );
};

export default ManualQREntry;
import React, { useState, useRef, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import './Attendance.css';

const QRScanner = ({ onScanSuccess, onScanError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning when video is ready
        videoRef.current.onloadedmetadata = () => {
          setIsScanning(true);
          startScanning();
        };
      }

    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsScanning(false);
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Import QR scanner dynamically
    import('qr-scanner').then(({ default: QrScanner }) => {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      qrScanner.start().catch(err => {
        console.error('QR Scanner start error:', err);
        setError('Failed to start QR scanner: ' + err.message);
      });

      // Store scanner reference for cleanup
      scanIntervalRef.current = qrScanner;
    }).catch(err => {
      console.error('QR Scanner import error:', err);
      setError('Failed to load QR scanner library');
    });
  };

  const handleScanResult = async (qrCode) => {
    if (processing || scanResult) return;

    try {
      setProcessing(true);
      setError('');

      console.log('QR Code scanned:', qrCode);

      // Call the attendance API to process the scan
      const response = await attendanceAPI.scanQRCode({
        qrCode: qrCode,
        scanType: 'checkin',
        location: await getCurrentLocation()
      });

      setScanResult(response);
      stopCamera();

      if (onScanSuccess) {
        onScanSuccess(response);
      }

    } catch (error) {
      console.error('QR scan processing error:', error);
      const errorMessage = error.message || 'Failed to process QR code scan';
      setError(errorMessage);
      
      if (onScanError) {
        onScanError(error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  const handleManualInput = () => {
    setShowManualEntry(true);
    stopCamera(); // Stop camera when entering manual mode
  };

  const submitManualCode = async (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      await handleScanResult(manualCode.trim());
      setManualCode('');
      setShowManualEntry(false);
    }
  };

  const cancelManualEntry = () => {
    setShowManualEntry(false);
    setManualCode('');
    if (!hasPermission) {
      startCamera(); // Restart camera if it wasn't working before
    }
  };

  const retryCamera = () => {
    stopCamera();
    setError('');
    setHasPermission(null);
    setScanResult(null);
    startCamera();
  };

  if (scanResult) {
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
            <p className="success-message">Your attendance has been successfully recorded</p>
            
            <div className="attendance-details">
              <div className="detail-card">
                <span className="detail-icon">📚</span>
                <div className="detail-info">
                  <span className="detail-label">Class</span>
                  <span className="detail-value">{scanResult.data?.className || 'N/A'}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <span className="detail-icon">⏰</span>
                <div className="detail-info">
                  <span className="detail-label">Check-in Time</span>
                  <span className="detail-value">
                    {scanResult.data?.scanTime ? new Date(scanResult.data.scanTime).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>
              
              <div className="detail-card">
                <span className="detail-icon">✅</span>
                <div className="detail-info">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{scanResult.data?.attendance?.status || 'Present'}</span>
                </div>
              </div>
            </div>
            
            <div className="success-tip">
              <span className="tip-icon">💡</span>
              <span>Great job! Keep up your fitness routine!</span>
            </div>
            
            <div className="success-actions">
              <button 
                className="btn-primary"
                onClick={onClose}
              >
                Done
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setScanResult(null)}
              >
                Scan Another
              </button>
            </div>
          </div>
          
          <button 
            className="success-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Manual Entry Modal
  if (showManualEntry) {
    return (
      <div className="qr-scanner-container">
        <div className="scanner-header">
          <h3>Enter QR Code Manually</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="manual-entry-section">
          <div className="manual-entry-info">
            <p>If you can't scan the QR code with your camera, you can enter the code manually.</p>
            <p>Ask your trainer to provide the QR code text.</p>
          </div>

          <form onSubmit={submitManualCode} className="manual-entry-form">
            <div className="form-group">
              <label htmlFor="manualCode">QR Code:</label>
              <input
                type="text"
                id="manualCode"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter the QR code here..."
                required
                autoFocus
                className="manual-code-input"
              />
              <small className="input-help">
                The QR code is usually a long string of letters and numbers
              </small>
            </div>

            <div className="manual-entry-actions">
              <button 
                type="submit" 
                className="action-btn primary"
                disabled={!manualCode.trim() || processing}
              >
                {processing ? 'Processing...' : 'Submit Code'}
              </button>
              <button 
                type="button" 
                className="action-btn secondary"
                onClick={cancelManualEntry}
                disabled={processing}
              >
                Back to Camera
              </button>
            </div>
          </form>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h3>Scan QR Code for Attendance</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Manual Entry Option - Always Visible */}
      <div className="manual-entry-option">
        <p>Can't scan? No problem!</p>
        <button className="manual-entry-btn" onClick={handleManualInput}>
          📝 Enter Code Manually
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          {hasPermission === false && (
            <div className="error-actions">
              <button className="action-btn secondary" onClick={retryCamera}>
                Retry Camera Access
              </button>
              <button className="action-btn secondary" onClick={handleManualInput}>
                Enter Code Manually
              </button>
            </div>
          )}
        </div>
      )}

      {hasPermission === null && (
        <div className="loading-camera">
          <div className="spinner"></div>
          <p>Requesting camera access...</p>
          <div className="loading-alternative">
            <p>Having trouble with camera?</p>
            <button className="action-btn secondary" onClick={handleManualInput}>
              Enter Code Manually Instead
            </button>
          </div>
        </div>
      )}

      {hasPermission === true && (
        <div className="scanner-view">
          <div className="video-container">
            <video
              ref={videoRef}
              className="scanner-video"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="scanner-canvas"
              style={{ display: 'none' }}
            />
            
            {/* Scanning overlay */}
            <div className="scan-overlay">
              <div className="scan-frame">
                <div className="scan-corners">
                  <div className="corner top-left"></div>
                  <div className="corner top-right"></div>
                  <div className="corner bottom-left"></div>
                  <div className="corner bottom-right"></div>
                </div>
              </div>
            </div>

            {processing && (
              <div className="processing-overlay">
                <div className="spinner"></div>
                <p>Processing QR code...</p>
              </div>
            )}
          </div>

          <div className="scanner-instructions">
            <p>Point your camera at the QR code displayed by your trainer</p>
            <p>Make sure the QR code is clearly visible and well-lit</p>
          </div>

          <div className="scanner-actions">
            <button className="action-btn secondary" onClick={handleManualInput}>
              Enter Code Manually
            </button>
            <button className="action-btn secondary" onClick={retryCamera}>
              Restart Camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
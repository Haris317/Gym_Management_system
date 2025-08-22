import React, { useState } from 'react';
import QRScanner from './QRScanner';
import { toast } from 'react-toastify';
import './Attendance.css';

const QRScanButton = ({ onScanSuccess, className = '', buttonText = '📱 Scan QR Code' }) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (result) => {
    setShowScanner(false);
    
    // Show success toast
    toast.success(`Attendance marked successfully for ${result.data?.className || 'class'}!`, {
      position: "top-right",
      autoClose: 3000,
    });

    if (onScanSuccess) {
      onScanSuccess(result);
    }
  };

  const handleScanError = (error) => {
    // Show error toast
    toast.error(error.message || 'Failed to scan QR code', {
      position: "top-right",
      autoClose: 5000,
    });
  };

  return (
    <>
      <button 
        className={`scan-btn ${className}`}
        onClick={() => setShowScanner(true)}
      >
        {buttonText}
      </button>

      {showScanner && (
        <div className="modal-overlay scanner-overlay">
          <div className="modal scanner-modal">
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default QRScanButton;
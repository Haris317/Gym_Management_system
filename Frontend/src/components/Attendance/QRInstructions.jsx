import React from 'react';
import './Attendance.css';

const QRInstructions = ({ userRole }) => {
  if (userRole === 'member') {
    return (
      <div className="qr-instructions-card">
        <h4>📱 How to Mark Attendance</h4>
        
        <div className="instruction-methods">
          <div className="method">
            <h5>Method 1: QR Code Scanning (Recommended)</h5>
            <ol>
              <li>Click "📱 Scan QR Code" button</li>
              <li>Allow camera access when prompted</li>
              <li>Point your camera at the QR code shown by your trainer</li>
              <li>Wait for automatic detection and confirmation</li>
            </ol>
          </div>

          <div className="method">
            <h5>Method 2: Manual Code Entry</h5>
            <ol>
              <li>Click "📱 Scan QR Code" button</li>
              <li>Click "Enter Code Manually" if camera doesn't work</li>
              <li>Ask your trainer for the QR code text</li>
              <li>Copy and paste or type the code in the text field</li>
              <li>Click "Mark Attendance" to submit</li>
            </ol>
          </div>
        </div>

        <div className="troubleshooting">
          <h5>🔧 Troubleshooting</h5>
          <ul>
            <li><strong>Camera not working?</strong> Use manual entry method</li>
            <li><strong>QR code not scanning?</strong> Make sure it's well-lit and clearly visible</li>
            <li><strong>Not enrolled error?</strong> Contact your trainer to enroll you in the class</li>
            <li><strong>Already checked in?</strong> You can only check in once per session</li>
          </ul>
        </div>
      </div>
    );
  }

  if (userRole === 'trainer' || userRole === 'admin') {
    return (
      <div className="qr-instructions-card">
        <h4>🎯 How to Generate QR Codes for Attendance</h4>
        
        <div className="instruction-methods">
          <div className="method">
            <h5>Step 1: Generate QR Code</h5>
            <ol>
              <li>Go to "QR Code Check-in" tab</li>
              <li>Find your class in the list</li>
              <li>Click "Generate QR Code" button</li>
              <li>QR code will be created and displayed</li>
            </ol>
          </div>

          <div className="method">
            <h5>Step 2: Display to Members</h5>
            <ol>
              <li>Show the QR code on your device screen</li>
              <li>Make sure it's large and clearly visible</li>
              <li>Keep the screen bright for better scanning</li>
              <li>Members can scan with their phones</li>
            </ol>
          </div>

          <div className="method">
            <h5>Step 3: Manual Code Sharing</h5>
            <ol>
              <li>Copy the manual entry code shown below the QR image</li>
              <li>Share via message/chat if members can't scan</li>
              <li>Members can enter this code manually</li>
              <li>Code expires in 2 hours for security</li>
            </ol>
          </div>
        </div>

        <div className="trainer-tips">
          <h5>💡 Tips for Trainers</h5>
          <ul>
            <li><strong>Generate early:</strong> Create QR codes before class starts</li>
            <li><strong>Display prominently:</strong> Show QR code where everyone can see</li>
            <li><strong>Help with manual entry:</strong> Share the code text for members having trouble</li>
            <li><strong>Monitor attendance:</strong> Check who has scanned in during class</li>
            <li><strong>Manual backup:</strong> Use manual attendance marking if needed</li>
          </ul>
        </div>
      </div>
    );
  }

  return null;
};

export default QRInstructions;
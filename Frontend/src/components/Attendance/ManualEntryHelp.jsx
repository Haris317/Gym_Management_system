import React from 'react';
import './Attendance.css';

const ManualEntryHelp = () => {
  return (
    <div className="manual-entry-help">
      <h4>📝 How to Enter QR Code Manually</h4>
      
      <div className="help-section">
        <h5>Step 1: Get the Code from Your Trainer</h5>
        <div className="help-content">
          <p>Ask your trainer to share the QR code text. It looks like this:</p>
          <div className="code-example">
            <code>a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6</code>
          </div>
          <p><small>This is just an example - your actual code will be different</small></p>
        </div>
      </div>

      <div className="help-section">
        <h5>Step 2: Where to Enter the Code</h5>
        <div className="help-options">
          <div className="help-option">
            <h6>Option A: From Scanner</h6>
            <ol>
              <li>Click "📱 Scan QR Code" button</li>
              <li>Click "📝 Enter Code Manually" (purple button at top)</li>
              <li>Paste the code in the text field</li>
              <li>Click "Submit Code"</li>
            </ol>
          </div>
          
          <div className="help-option">
            <h6>Option B: From Manual Tab</h6>
            <ol>
              <li>Click "📝 Manual Entry" tab</li>
              <li>Paste the code in the text area</li>
              <li>Click "✅ Mark Attendance"</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="help-section">
        <h5>Step 3: Tips for Success</h5>
        <div className="help-tips">
          <div className="tip">
            <span className="tip-icon">💡</span>
            <p>Copy the entire code - don't leave out any characters</p>
          </div>
          <div className="tip">
            <span className="tip-icon">📋</span>
            <p>Use "Paste from Clipboard" button for accuracy</p>
          </div>
          <div className="tip">
            <span className="tip-icon">⏰</span>
            <p>QR codes expire in 2 hours, so use them quickly</p>
          </div>
          <div className="tip">
            <span className="tip-icon">✅</span>
            <p>You must be enrolled in the class to mark attendance</p>
          </div>
        </div>
      </div>

      <div className="help-section">
        <h5>Common Issues & Solutions</h5>
        <div className="troubleshooting-list">
          <div className="issue">
            <strong>❌ "Invalid QR code" error</strong>
            <p>Make sure you copied the complete code without extra spaces</p>
          </div>
          <div className="issue">
            <strong>❌ "Not enrolled" error</strong>
            <p>Ask your trainer to enroll you in the class first</p>
          </div>
          <div className="issue">
            <strong>❌ "Already checked in" error</strong>
            <p>You can only check in once per class session</p>
          </div>
          <div className="issue">
            <strong>❌ "Expired code" error</strong>
            <p>Ask your trainer to generate a new QR code</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualEntryHelp;
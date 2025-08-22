import React, { useState, useEffect } from 'react';
import { attendanceAPI, classesAPI } from '../../services/api';
import QRCode from 'react-qr-code';
import QRScanner from './QRScanner';
import './Attendance.css';

const AttendanceManagement = ({ userRole, userId, userName }) => {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('records');
  
  // QR Code states
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  
  // QR Scanner states (for members)
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  // Manual attendance form
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    memberId: '',
    memberName: '',
    classId: '',
    className: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    status: 'present'
  });
  
  // Success modal state
  const [showAttendanceSuccess, setShowAttendanceSuccess] = useState(false);
  const [attendanceSuccessData, setAttendanceSuccessData] = useState(null);

  useEffect(() => {
    loadData();
  }, [userRole, userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises = [];
      
      // Load attendance records
      if (userRole === 'member') {
        promises.push(attendanceAPI.getAttendance({ memberId: userId }));
      } else {
        promises.push(attendanceAPI.getAttendance());
      }
      
      // Load classes for trainers and admins
      if (userRole === 'trainer' || userRole === 'admin') {
        promises.push(classesAPI.getAllClasses());
      }

      const results = await Promise.all(promises);
      setAttendance(results[0].data);
      
      if (results[1]) {
        setClasses(results[1].data);
      }
    } catch (error) {
      setError('Failed to load attendance data');
      console.error('Attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (classId) => {
    try {
      const classItem = classes.find(c => c._id === classId || c.id === classId);
      const response = await attendanceAPI.generateQRCode(classId);
      
      setQrData(response.data);
      setSelectedClass(classItem);
      setShowQRModal(true);
    } catch (error) {
      setError('Failed to generate QR code: ' + (error.message || 'Unknown error'));
      console.error('QR Generation error:', error);
    }
  };

  const markAttendance = async (e) => {
    e.preventDefault();
    try {
      await attendanceAPI.markAttendance(attendanceForm);
      setAttendanceForm({
        memberId: '',
        memberName: '',
        classId: '',
        className: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        status: 'present'
      });
      setShowAttendanceForm(false);
      loadData();
    } catch (error) {
      setError('Failed to mark attendance');
    }
  };

  const getAttendanceStats = () => {
    if (userRole === 'member') {
      const totalSessions = attendance.length;
      const presentSessions = attendance.filter(a => a.status === 'present').length;
      const attendanceRate = totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(1) : 0;
      
      return { totalSessions, presentSessions, attendanceRate };
    }
    return null;
  };

  const stats = getAttendanceStats();

  if (loading) return <div className="loading">Loading attendance data...</div>;

  return (
    <div className="attendance-management">
      <div className="attendance-header">
        <h2>Attendance Management</h2>
        <div className="header-actions">
          {userRole === 'member' && (
            <>
              <button className="action-btn scan-btn" onClick={() => setShowQRScanner(true)}>
                📱 Scan QR Code
              </button>
              <button className="action-btn manual-btn" onClick={() => setActiveTab('manual')}>
                📝 Enter Code Manually
              </button>
            </>
          )}
          {(userRole === 'trainer' || userRole === 'admin') && (
            <button className="action-btn" onClick={() => setShowAttendanceForm(true)}>
              Mark Attendance
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Member Stats */}
      {userRole === 'member' && stats && (
        <div className="attendance-stats">
          <div className="stat-card">
            <h3>{stats.totalSessions}</h3>
            <p>Total Sessions</p>
          </div>
          <div className="stat-card">
            <h3>{stats.presentSessions}</h3>
            <p>Attended</p>
          </div>
          <div className="stat-card">
            <h3>{stats.attendanceRate}%</h3>
            <p>Attendance Rate</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="attendance-tabs">
        <button 
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          Attendance Records ({attendance.length})
        </button>
        {userRole === 'member' && (
          <>
            <button 
              className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
              onClick={() => setActiveTab('scan')}
            >
              📱 QR Scanner
            </button>
            <button 
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              📝 Manual Entry
            </button>
          </>
        )}
        {(userRole === 'trainer' || userRole === 'admin') && (
          <button 
            className={`tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            QR Code Check-in
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'records' && (
          <div className="attendance-records">
            <div className="records-table">
              <table>
                <thead>
                  <tr>
                    {userRole !== 'member' && <th>Member</th>}
                    <th>Class</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Check-in Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(record => (
                    <tr key={record._id || record.id}>
                      {userRole !== 'member' && (
                        <td>
                          {record.member?.firstName && record.member?.lastName 
                            ? `${record.member.firstName} ${record.member.lastName}` 
                            : record.memberName || 'N/A'}
                        </td>
                      )}
                      <td>
                        {record.class?.name || record.className || 'N/A'}
                      </td>
                      <td>
                        {record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        {record.scheduledStartTime || record.time || 'N/A'}
                      </td>
                      <td>
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td>
                        <span className={`status ${record.status}`}>
                          {record.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'scan' && userRole === 'member' && (
          <div className="scan-section">
            <div className="scan-instructions">
              <h3>📱 QR Code Scanner</h3>
              <p>Use your camera to scan the QR code displayed by your trainer to mark attendance.</p>
              <div className="scan-steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <p>Ask your trainer to generate a QR code for the class</p>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <p>Click "Scan QR Code" button below</p>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <p>Point your camera at the QR code</p>
                </div>
                <div className="step">
                  <span className="step-number">4</span>
                  <p>Your attendance will be marked automatically</p>
                </div>
              </div>
              <button 
                className="scan-btn-large"
                onClick={() => setShowQRScanner(true)}
              >
                📱 Start QR Scanner
              </button>
            </div>
          </div>
        )}

        {activeTab === 'manual' && userRole === 'member' && (
          <div className="manual-section">
            <div className="manual-instructions">
              <h3>📝 Manual Code Entry</h3>
              <p>Enter the QR code text manually if camera scanning doesn't work.</p>
              
              <div className="manual-steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <p>Ask your trainer for the QR code text</p>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <p>Copy the code from trainer's message/screen</p>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <p>Paste or type the code in the field below</p>
                </div>
                <div className="step">
                  <span className="step-number">4</span>
                  <p>Click "Mark Attendance" to submit</p>
                </div>
              </div>

              <div className="manual-entry-form-container">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const qrCode = formData.get('qrCode');
                  
                  if (!qrCode.trim()) return;
                  
                  try {
                    setError('');
                    const response = await attendanceAPI.scanQRCode({
                      qrCode: qrCode.trim(),
                      scanType: 'checkin',
                      location: null
                    });
                    
                    setError('');
                    setAttendanceSuccessData({
                      className: 'Manual Entry',
                      scanTime: new Date().toISOString(),
                      status: 'Present'
                    });
                    setShowAttendanceSuccess(true);
                    loadData(); // Refresh data
                    e.target.reset(); // Clear form
                    
                    // Auto-hide success modal after 3 seconds
                    setTimeout(() => {
                      setShowAttendanceSuccess(false);
                    }, 3000);
                    
                  } catch (error) {
                    setError(error.message || 'Failed to process QR code');
                  }
                }}>
                  <div className="form-group">
                    <label htmlFor="qrCodeInput">QR Code Text:</label>
                    <textarea
                      id="qrCodeInput"
                      name="qrCode"
                      placeholder="Paste the QR code text here..."
                      required
                      rows={4}
                      className="manual-code-input"
                    />
                    <small className="input-help">
                      The code is usually a long string like: a1b2c3d4e5f6g7h8...
                    </small>
                  </div>

                  <div className="manual-entry-actions">
                    <button type="submit" className="action-btn primary">
                      ✅ Mark Attendance
                    </button>
                    <button 
                      type="button" 
                      className="action-btn secondary"
                      onClick={() => {
                        navigator.clipboard.readText().then(text => {
                          document.getElementById('qrCodeInput').value = text;
                        }).catch(() => {
                          alert('Please copy the QR code first, then try pasting');
                        });
                      }}
                    >
                      📋 Paste from Clipboard
                    </button>
                  </div>
                </form>
              </div>

              <div className="manual-help">
                <h5>💡 Need Help?</h5>
                <ul>
                  <li>Ask your trainer to share the QR code text via message</li>
                  <li>The code should be a long string of letters and numbers</li>
                  <li>Make sure to copy the entire code without spaces at the ends</li>
                  <li>You must be enrolled in the class to mark attendance</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (userRole === 'trainer' || userRole === 'admin') && (
          <div className="qr-section">
            <h3>Generate QR Code for Class Check-in</h3>
            <div className="classes-list">
              {classes.map(classItem => (
                <div key={classItem._id || classItem.id} className="class-item">
                  <div className="class-info">
                    <h4>{classItem.name}</h4>
                    <p>Trainer: {classItem.trainer?.firstName && classItem.trainer?.lastName 
                      ? `${classItem.trainer.firstName} ${classItem.trainer.lastName}` 
                      : classItem.trainerName || 'N/A'}</p>
                    <p>Time: {classItem.schedule?.startTime || classItem.time} - {classItem.schedule?.endTime || classItem.endTime}</p>
                    <p>Capacity: {classItem.capacity || 'N/A'} | Enrolled: {classItem.currentEnrollment || 0}</p>
                  </div>
                  <button 
                    className="qr-btn"
                    onClick={() => generateQRCode(classItem._id || classItem.id)}
                  >
                    Generate QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && qrData && (
        <div className="modal-overlay">
          <div className="modal qr-modal">
            <h3>QR Code for {selectedClass?.name}</h3>
            <div className="qr-container">
              <QRCode 
                value={qrData.qrSession?.qrCode || 'No QR Code'} 
                size={200}
                level="M"
              />
            </div>
            
            <div className="qr-code-text">
              <p><strong>Manual Entry Code:</strong></p>
              <code>{qrData.qrSession?.qrCode || 'No QR Code'}</code>
              <button 
                className="copy-code-btn"
                onClick={() => {
                  navigator.clipboard.writeText(qrData.qrSession?.qrCode || '');
                  // Show copy success feedback
                  const btn = event.target;
                  const originalText = btn.textContent;
                  btn.textContent = 'Copied!';
                  btn.style.background = '#28a745';
                  setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#17a2b8';
                  }, 2000);
                }}
              >
                Copy Code
              </button>
              <p className="input-help">
                Members can enter this code manually if camera scanning doesn't work
              </p>
            </div>
            <div className="qr-info">
              <p><strong>Class:</strong> {selectedClass?.name || 'N/A'}</p>
              <p><strong>Date:</strong> {qrData.qrSession?.metadata?.classDate 
                ? new Date(qrData.qrSession.metadata.classDate).toLocaleDateString() 
                : new Date().toLocaleDateString()}</p>
              <p><strong>Time:</strong> {qrData.qrSession?.metadata?.startTime || 'N/A'}</p>
              <p><strong>Expires:</strong> {qrData.qrSession?.expiresAt 
                ? new Date(qrData.qrSession.expiresAt).toLocaleString() 
                : 'N/A'}</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowQRModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="modal-overlay scanner-overlay">
          <div className="modal scanner-modal">
            <QRScanner
              onScanSuccess={(result) => {
                console.log('QR Scan successful:', result);
                setError('');
                loadData(); // Refresh attendance data
              }}
              onScanError={(error) => {
                console.error('QR Scan error:', error);
                setError(error.message || 'Failed to scan QR code');
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      )}

      {/* Manual Attendance Form */}
      {showAttendanceForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Mark Attendance</h3>
            <form onSubmit={markAttendance}>
              <input
                type="text"
                placeholder="Member Name"
                value={attendanceForm.memberName}
                onChange={(e) => setAttendanceForm({...attendanceForm, memberName: e.target.value})}
                required
              />
              
              <select
                value={attendanceForm.classId}
                onChange={(e) => {
                  const classItem = classes.find(c => (c._id || c.id) === e.target.value);
                  setAttendanceForm({
                    ...attendanceForm, 
                    classId: e.target.value,
                    className: classItem ? classItem.name : '',
                    time: classItem ? (classItem.schedule?.startTime || classItem.time) : ''
                  });
                }}
                required
              >
                <option value="">Select Class</option>
                {classes.map(classItem => (
                  <option key={classItem._id || classItem.id} value={classItem._id || classItem.id}>
                    {classItem.name} - {classItem.schedule?.startTime || classItem.time || 'No time'}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={attendanceForm.date}
                onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})}
                required
              />

              <select
                value={attendanceForm.status}
                onChange={(e) => setAttendanceForm({...attendanceForm, status: e.target.value})}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>

              <div className="modal-actions">
                <button type="submit">Mark Attendance</button>
                <button type="button" onClick={() => setShowAttendanceForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Success Modal */}
      {showAttendanceSuccess && attendanceSuccessData && (
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
                    <span className="detail-value">{attendanceSuccessData.className || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="detail-card">
                  <span className="detail-icon">⏰</span>
                  <div className="detail-info">
                    <span className="detail-label">Check-in Time</span>
                    <span className="detail-value">
                      {attendanceSuccessData.scanTime ? new Date(attendanceSuccessData.scanTime).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>
                
                <div className="detail-card">
                  <span className="detail-icon">✅</span>
                  <div className="detail-info">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">{attendanceSuccessData.status || 'Present'}</span>
                  </div>
                </div>
              </div>
              
              <div className="success-tip">
                <span className="tip-icon">🏆</span>
                <span>Excellent! Keep up your consistent attendance!</span>
              </div>
              
              <div className="success-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setShowAttendanceSuccess(false)}
                >
                  Done
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAttendanceSuccess(false);
                    setActiveTab('records');
                  }}
                >
                  View Records
                </button>
              </div>
            </div>
            
            <button 
              className="success-close"
              onClick={() => setShowAttendanceSuccess(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;

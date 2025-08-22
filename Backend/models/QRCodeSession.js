const mongoose = require('mongoose');
const crypto = require('crypto');

const qrCodeSessionSchema = new mongoose.Schema({
    class: {
        type: mongoose.Schema.ObjectId,
        ref: 'Class',
        required: [true, 'Class is required']
    },
    qrCode: {
        type: String,
        required: true,
        unique: true
    },
    generatedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Generator is required']
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    maxUsage: {
        type: Number,
        default: 100 // Maximum number of scans allowed
    },
    sessionType: {
        type: String,
        enum: ['checkin', 'checkout', 'both'],
        default: 'both'
    },
    location: {
        room: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    metadata: {
        classDate: Date,
        startTime: String,
        endTime: String,
        capacity: Number
    },
    scannedBy: [{
        member: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        scannedAt: {
            type: Date,
            default: Date.now
        },
        scanType: {
            type: String,
            enum: ['checkin', 'checkout'],
            default: 'checkin'
        },
        location: {
            latitude: Number,
            longitude: Number
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
qrCodeSessionSchema.index({ qrCode: 1 });
qrCodeSessionSchema.index({ class: 1, isActive: 1 });
qrCodeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
qrCodeSessionSchema.index({ generatedBy: 1, createdAt: -1 });

// Static method to generate unique QR code
qrCodeSessionSchema.statics.generateQRCode = function () {
    return crypto.randomBytes(32).toString('hex');
};

// Instance method to check if QR code is expired
qrCodeSessionSchema.methods.isExpired = function () {
    return Date.now() >= this.expiresAt.getTime();
};

// Instance method to check if QR code has reached max usage
qrCodeSessionSchema.methods.hasReachedMaxUsage = function () {
    return this.usageCount >= this.maxUsage;
};

// Instance method to check if QR code is valid for scanning
qrCodeSessionSchema.methods.isValidForScanning = function () {
    return this.isActive &&
        !this.isExpired() &&
        !this.hasReachedMaxUsage();
};

// Instance method to record a scan
qrCodeSessionSchema.methods.recordScan = function (memberId, scanType = 'checkin', location = null) {
    // Check if member already scanned for this type
    const existingScan = this.scannedBy.find(scan =>
        scan.member.toString() === memberId.toString() &&
        scan.scanType === scanType
    );

    if (existingScan && scanType === 'checkin') {
        throw new Error('Member has already checked in for this session');
    }

    // Add the scan record
    this.scannedBy.push({
        member: memberId,
        scanType,
        location,
        scannedAt: new Date()
    });

    // Increment usage count
    this.usageCount += 1;

    return this.save();
};

// Instance method to deactivate QR code
qrCodeSessionSchema.methods.deactivate = function () {
    this.isActive = false;
    return this.save();
};

// Static method to cleanup expired sessions
qrCodeSessionSchema.statics.cleanupExpired = async function () {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
        ]
    });
};

// Static method to get active session for a class
qrCodeSessionSchema.statics.getActiveSessionForClass = async function (classId) {
    return this.findOne({
        class: classId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).populate('class generatedBy');
};

// Virtual for remaining usage
qrCodeSessionSchema.virtual('remainingUsage').get(function () {
    return Math.max(0, this.maxUsage - this.usageCount);
});

// Virtual for scan statistics
qrCodeSessionSchema.virtual('scanStats').get(function () {
    const checkins = this.scannedBy.filter(scan => scan.scanType === 'checkin').length;
    const checkouts = this.scannedBy.filter(scan => scan.scanType === 'checkout').length;

    return {
        totalScans: this.scannedBy.length,
        checkins,
        checkouts,
        uniqueMembers: [...new Set(this.scannedBy.map(scan => scan.member.toString()))].length
    };
});

module.exports = mongoose.model('QRCodeSession', qrCodeSessionSchema);
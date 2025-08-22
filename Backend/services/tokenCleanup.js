const RefreshToken = require('../models/RefreshToken');
const cron = require('node-cron');

class TokenCleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Clean up expired refresh tokens
  async cleanupExpiredTokens() {
    try {
      console.log('🧹 Starting token cleanup...');
      
      const result = await RefreshToken.cleanupExpired();
      
      console.log(`✅ Cleaned up ${result.deletedCount} expired refresh tokens`);
      
      return result;
    } catch (error) {
      console.error('❌ Error during token cleanup:', error);
      throw error;
    }
  }

  // Clean up old tokens for users (keep only last 5 per user)
  async cleanupOldTokens() {
    try {
      console.log('🧹 Starting old token cleanup...');
      
      // Get all users with more than 5 active tokens
      const pipeline = [
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$user',
            tokens: { $push: { id: '$_id', createdAt: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        {
          $match: { count: { $gt: 5 } }
        }
      ];

      const usersWithManyTokens = await RefreshToken.aggregate(pipeline);
      
      let totalCleaned = 0;

      for (const userTokens of usersWithManyTokens) {
        // Sort tokens by creation date (newest first) and keep only first 5
        const sortedTokens = userTokens.tokens.sort((a, b) => b.createdAt - a.createdAt);
        const tokensToDelete = sortedTokens.slice(5).map(t => t.id);

        if (tokensToDelete.length > 0) {
          const result = await RefreshToken.updateMany(
            { _id: { $in: tokensToDelete } },
            { isActive: false }
          );
          totalCleaned += result.modifiedCount;
        }
      }

      console.log(`✅ Cleaned up ${totalCleaned} old refresh tokens`);
      
      return { deletedCount: totalCleaned };
    } catch (error) {
      console.error('❌ Error during old token cleanup:', error);
      throw error;
    }
  }

  // Run full cleanup
  async runCleanup() {
    if (this.isRunning) {
      console.log('⏳ Token cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const expiredResult = await this.cleanupExpiredTokens();
      const oldResult = await this.cleanupOldTokens();

      console.log(`🎉 Token cleanup completed. Removed ${expiredResult.deletedCount + oldResult.deletedCount} tokens total.`);
    } catch (error) {
      console.error('❌ Token cleanup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Start scheduled cleanup (runs every 6 hours)
  startScheduledCleanup() {
    console.log('🕐 Starting scheduled token cleanup (every 6 hours)...');
    
    // Run cleanup every 6 hours
    cron.schedule('0 */6 * * *', () => {
      this.runCleanup();
    });

    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.runCleanup();
    }, 60000);
  }

  // Stop scheduled cleanup
  stopScheduledCleanup() {
    console.log('🛑 Stopping scheduled token cleanup...');
    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // In a production environment, you might want to store the task reference
  }

  // Get token statistics
  async getTokenStats() {
    try {
      const stats = await RefreshToken.aggregate([
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            activeTokens: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0]
              }
            },
            expiredTokens: {
              $sum: {
                $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalTokens: 0,
        activeTokens: 0,
        expiredTokens: 0
      };

      // Get unique users with tokens
      const uniqueUsers = await RefreshToken.distinct('user', { isActive: true });
      result.usersWithTokens = uniqueUsers.length;

      return result;
    } catch (error) {
      console.error('❌ Error getting token stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const tokenCleanupService = new TokenCleanupService();

module.exports = tokenCleanupService;
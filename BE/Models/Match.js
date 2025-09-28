const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unmatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  unmatchedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
matchSchema.index({ users: 1 });
matchSchema.index({ lastActivity: -1 });
matchSchema.index({ isActive: 1 });
matchSchema.index({ createdAt: -1 });

// Ensure only 2 users per match
matchSchema.pre('save', function(next) {
  if (this.users.length !== 2) {
    return next(new Error('A match must have exactly 2 users'));
  }
  next();
});

// Virtual to get the other user in the match
matchSchema.virtual('otherUser').get(function() {
  // This virtual needs to be populated with the current user's ID
  // Usage: match.otherUser(currentUserId)
  return function(currentUserId) {
    return this.users.find(userId => userId.toString() !== currentUserId.toString());
  };
});

// Static method to find matches for a user
matchSchema.statics.findUserMatches = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    users: userId,
    isActive: true
  })
  .populate({
    path: 'users',
    select: 'name photos age bio lastActive isOnline',
    match: { _id: { $ne: userId } }
  })
  .populate({
    path: 'lastMessage',
    select: 'content sender timestamp messageType isRead'
  })
  .sort({ lastActivity: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
};

// Static method to check if two users are matched
matchSchema.statics.areUsersMatched = async function(userId1, userId2) {
  return this.findOne({
    users: { $all: [userId1, userId2] },
    isActive: true
  });
};

// Instance method to add a message
matchSchema.methods.addMessage = async function(messageId) {
  this.messages.push(messageId);
  this.lastMessage = messageId;
  this.lastActivity = new Date();
  await this.save();
};

// Instance method to unmatch
matchSchema.methods.unmatch = async function(userId) {
  this.isActive = false;
  this.unmatchedBy = userId;
  this.unmatchedAt = new Date();
  await this.save();
  
  // Remove match from both users
  const User = mongoose.model('User');
  await User.updateMany(
    { _id: { $in: this.users } },
    { $pull: { matches: this._id } }
  );
  
  // Mark all messages as inactive
  const Message = mongoose.model('Message');
  await Message.updateMany(
    { match: this._id },
    { isActive: false }
  );
};

// Instance method to get match details for a specific user
matchSchema.methods.getMatchDetailsForUser = async function(userId) {
  await this.populate([
    {
      path: 'users',
      select: 'name photos age bio lastActive isOnline location.city',
      match: { _id: { $ne: userId } }
    },
    {
      path: 'lastMessage',
      select: 'content sender timestamp messageType isRead'
    }
  ]);
  
  const otherUser = this.users.find(user => user._id.toString() !== userId.toString());
  
  return {
    _id: this._id,
    user: otherUser,
    lastMessage: this.lastMessage,
    lastActivity: this.lastActivity,
    createdAt: this.createdAt,
    unreadCount: await this.getUnreadCount(userId)
  };
};

// Instance method to get unread message count for a user
matchSchema.methods.getUnreadCount = async function(userId) {
  const Message = mongoose.model('Message');
  return Message.countDocuments({
    match: this._id,
    sender: { $ne: userId },
    isRead: false,
    isActive: true
  });
};

// Static method to get match statistics
matchSchema.statics.getMatchStats = async function(userId) {
  const totalMatches = await this.countDocuments({
    users: userId,
    isActive: true
  });
  
  const recentMatches = await this.countDocuments({
    users: userId,
    isActive: true,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  });
  
  const matchesWithMessages = await this.countDocuments({
    users: userId,
    isActive: true,
    messages: { $ne: [] }
  });
  
  return {
    totalMatches,
    recentMatches,
    matchesWithMessages,
    conversionRate: totalMatches > 0 ? (matchesWithMessages / totalMatches * 100).toFixed(1) : 0
  };
};

module.exports = mongoose.model('Match', matchSchema);
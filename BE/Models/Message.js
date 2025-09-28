const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    },
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'gif', 'emoji'],
    default: 'text'
  },
  imageUrl: {
    type: String,
    required: function() {
      return this.messageType === 'image';
    }
  },
  gifUrl: {
    type: String,
    required: function() {
      return this.messageType === 'gif';
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  editedAt: {
    type: Date,
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ match: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ isActive: 1 });

// Validate that sender and recipient are different
messageSchema.pre('save', function(next) {
  if (this.sender.toString() === this.recipient.toString()) {
    return next(new Error('Sender and recipient cannot be the same'));
  }
  next();
});

// Auto-set delivery status
messageSchema.pre('save', function(next) {
  if (this.isNew) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
  }
  next();
});

// Update match's last activity when message is saved
messageSchema.post('save', async function(doc) {
  try {
    const Match = mongoose.model('Match');
    const match = await Match.findById(doc.match);
    if (match) {
      await match.addMessage(doc._id);
    }
  } catch (error) {
    console.error('Error updating match last activity:', error);
  }
});

// Static method to get messages for a match
messageSchema.statics.getMatchMessages = async function(matchId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    match: matchId,
    isActive: true
  })
  .populate('sender', 'name photos')
  .populate('recipient', 'name photos')
  .populate('replyTo', 'content sender messageType')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(matchId, userId) {
  const result = await this.updateMany(
    {
      match: matchId,
      recipient: userId,
      isRead: false,
      isActive: true
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
  
  return result.modifiedCount;
};

// Static method to get unread messages count for a user
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isActive: true
  });
};

// Static method to delete messages (soft delete)
messageSchema.statics.deleteMessage = async function(messageId, userId) {
  const message = await this.findOne({
    _id: messageId,
    sender: userId,
    isActive: true
  });
  
  if (!message) {
    throw new Error('Message not found or unauthorized');
  }
  
  // Soft delete - just mark as inactive
  message.isActive = false;
  await message.save();
  
  return message;
};

// Static method to edit message
messageSchema.statics.editMessage = async function(messageId, userId, newContent) {
  const message = await this.findOne({
    _id: messageId,
    sender: userId,
    isActive: true,
    messageType: 'text'
  });
  
  if (!message) {
    throw new Error('Message not found or unauthorized');
  }
  
  // Check if message is not too old (e.g., 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (message.createdAt < fifteenMinutesAgo) {
    throw new Error('Message is too old to edit');
  }
  
  message.content = newContent;
  message.editedAt = new Date();
  await message.save();
  
  return message;
};

// Instance method to format message for response
messageSchema.methods.toResponse = function() {
  return {
    _id: this._id,
    content: this.content,
    messageType: this.messageType,
    imageUrl: this.imageUrl,
    gifUrl: this.gifUrl,
    sender: this.sender,
    recipient: this.recipient,
    isRead: this.isRead,
    readAt: this.readAt,
    isDelivered: this.isDelivered,
    deliveredAt: this.deliveredAt,
    editedAt: this.editedAt,
    replyTo: this.replyTo,
    timestamp: this.createdAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to get message statistics
messageSchema.statics.getMessageStats = async function(userId) {
  const totalSent = await this.countDocuments({
    sender: userId,
    isActive: true
  });
  
  const totalReceived = await this.countDocuments({
    recipient: userId,
    isActive: true
  });
  
  const unreadReceived = await this.countDocuments({
    recipient: userId,
    isRead: false,
    isActive: true
  });
  
  const todaysSent = await this.countDocuments({
    sender: userId,
    isActive: true,
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  
  return {
    totalSent,
    totalReceived,
    unreadReceived,
    todaysSent
  };
};

module.exports = mongoose.model('Message', messageSchema);
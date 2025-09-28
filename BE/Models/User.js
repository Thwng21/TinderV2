const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [18, 'You must be at least 18 years old'],
    max: [100, 'Age cannot exceed 100']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  interestedIn: {
    type: String,
    required: [true, 'Interest preference is required'],
    enum: ['male', 'female', 'both']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    city: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    }
  },
  photos: [{
    url: {
      type: String,
      required: true
    },
    isMain: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    ageRange: {
      min: {
        type: Number,
        default: 18,
        min: 18
      },
      max: {
        type: Number,
        default: 50,
        max: 100
      }
    },
    maxDistance: {
      type: Number,
      default: 50, // kilometers
      min: 1,
      max: 500
    }
  },
  swipedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['like', 'pass'],
      required: true
    },
    swipedAt: {
      type: Date,
      default: Date.now
    }
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  pushToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ isActive: 1 });
userSchema.index({ lastActive: -1 });

// Virtual for main photo
userSchema.virtual('mainPhoto').get(function() {
  const mainPhoto = this.photos.find(photo => photo.isMain);
  return mainPhoto ? mainPhoto.url : (this.photos.length > 0 ? this.photos[0].url : null);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update lastActive on save
userSchema.pre('save', function(next) {
  if (this.isModified('isOnline') && this.isOnline) {
    this.lastActive = Date.now();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get users for swiping
userSchema.methods.getPotentialMatches = async function(limit = 10) {
  const swipedUserIds = this.swipedUsers.map(swipe => swipe.userId);
  swipedUserIds.push(this._id); // Exclude self
  
  const query = {
    _id: { $nin: swipedUserIds },
    isActive: true,
    age: {
      $gte: this.preferences.ageRange.min,
      $lte: this.preferences.ageRange.max
    }
  };
  
  // Filter by gender preference
  if (this.interestedIn !== 'both') {
    query.gender = this.interestedIn;
  }
  
  // Add location filter if user has location
  if (this.location.coordinates[0] !== 0 || this.location.coordinates[1] !== 0) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: this.location.coordinates
        },
        $maxDistance: this.preferences.maxDistance * 1000 // Convert km to meters
      }
    };
  }
  
  return mongoose.model('User').find(query)
    .select('-password -swipedUsers')
    .limit(limit)
    .sort({ lastActive: -1 });
};

// Add swipe action
userSchema.methods.addSwipe = async function(targetUserId, action) {
  // Check if already swiped
  const existingSwipe = this.swipedUsers.find(
    swipe => swipe.userId.toString() === targetUserId.toString()
  );
  
  if (existingSwipe) {
    throw new Error('Already swiped on this user');
  }
  
  this.swipedUsers.push({
    userId: targetUserId,
    action: action
  });
  
  await this.save();
  
  // Check for match if it's a like
  if (action === 'like') {
    const targetUser = await mongoose.model('User').findById(targetUserId);
    const targetUserLikedBack = targetUser.swipedUsers.find(
      swipe => swipe.userId.toString() === this._id.toString() && swipe.action === 'like'
    );
    
    if (targetUserLikedBack) {
      // Create a match
      const Match = mongoose.model('Match');
      const match = new Match({
        users: [this._id, targetUserId]
      });
      await match.save();
      
      // Add match to both users
      this.matches.push(match._id);
      targetUser.matches.push(match._id);
      
      await this.save();
      await targetUser.save();
      
      return { match: true, matchId: match._id };
    }
  }
  
  return { match: false };
};

// Clean up old swipes (optional, for performance)
userSchema.methods.cleanOldSwipes = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  this.swipedUsers = this.swipedUsers.filter(
    swipe => swipe.swipedAt > cutoffDate
  );
  
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
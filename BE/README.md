# Tinder V2 Backend API

A complete Tinder-like backend application built with Node.js, Express, MongoDB, and Socket.IO for real-time messaging.

## Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Account management (update profile, change password, delete account)

### 👤 User Management
- User profiles with photos, bio, age, location
- Photo upload and management
- Location-based matching preferences
- User discovery and swiping system
- Profile completeness tracking and statistics

### 💘 Matching System
- Swipe-based matching (like/pass)
- Location-based user discovery
- Age and gender preference filtering
- Match statistics and analytics
- Unmatch functionality

### 💬 Real-time Messaging
- Socket.IO powered real-time chat
- Text, image, GIF, and emoji messages
- Message read receipts
- Typing indicators
- Message editing and deletion
- Reply to messages functionality

### 📊 Analytics & Statistics
- User activity statistics
- Match success rates
- Message analytics
- Profile performance metrics

## Technology Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Environment Configuration**: dotenv

## Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB Atlas account or local MongoDB instance
- Your IP whitelisted in MongoDB Atlas

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd BE
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   The `.env` file is already configured with your MongoDB connection string:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://tinder:<matkhau>@tinderv2.ejfnrvl.mongodb.net/?retryWrites=true&w=majority&appName=TinderV2
   JWT_SECRET=your_jwt_secret_key_here_change_in_production
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:8081
   ```

4. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   
   # Direct Node.js execution
   node Server.js
   ```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `DELETE /api/auth/delete-account` - Delete account

#### Users
- `GET /api/users/discover` - Get potential matches
- `POST /api/users/swipe` - Swipe on user (like/pass)
- `GET /api/users/profile/:userId` - Get user profile
- `POST /api/users/upload-photo` - Upload photo
- `DELETE /api/users/delete-photo/:photoId` - Delete photo
- `PUT /api/users/set-main-photo/:photoId` - Set main photo
- `PUT /api/users/update-location` - Update location
- `GET /api/users/stats` - Get user statistics

#### Matches
- `GET /api/matches` - Get user matches
- `GET /api/matches/:matchId` - Get specific match
- `DELETE /api/matches/:matchId` - Unmatch user
- `GET /api/matches/:matchId/messages` - Get match messages
- `GET /api/matches/stats/overview` - Get match statistics
- `GET /api/matches/activity/recent` - Get recent activity
- `POST /api/matches/:matchId/report` - Report match

#### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/unread-count` - Get unread count
- `PUT /api/messages/:messageId/read` - Mark message as read
- `PUT /api/messages/match/:matchId/read-all` - Mark all messages as read
- `DELETE /api/messages/:messageId` - Delete message
- `PUT /api/messages/:messageId/edit` - Edit message
- `GET /api/messages/stats` - Get message statistics
- `GET /api/messages/search` - Search messages

#### Health Check
- `GET /api/health` - Server health check

### Socket.IO Events

#### Client to Server
- `join` - Join user's personal room
- `send_message` - Send real-time message
- `typing` - Send typing indicator
- `stop_typing` - Stop typing indicator

#### Server to Client
- `receive_message` - Receive real-time message
- `new_match` - New match notification
- `unmatched` - Unmatch notification
- `user_typing` - User typing notification
- `user_stop_typing` - User stopped typing
- `message_sent` - Message delivery confirmation
- `message_read` - Message read receipt
- `messages_read` - Multiple messages read
- `message_deleted` - Message deletion notification
- `message_edited` - Message edit notification

## Project Structure

```
BE/
├── Controllers/        # Route controllers (empty, logic in routes)
├── Middlewares/        # Custom middleware
│   └── auth.js        # JWT authentication middleware
├── Models/            # Mongoose models
│   ├── User.js        # User model with authentication & matching logic
│   ├── Match.js       # Match model with relationship management
│   └── Message.js     # Message model with real-time chat support
├── Routes/            # API route definitions
│   ├── authRoutes.js  # Authentication endpoints
│   ├── userRoutes.js  # User management endpoints
│   ├── matchRoutes.js # Matching system endpoints
│   └── messageRoutes.js # Messaging endpoints
├── Services/          # Business logic services (empty, logic in models)
├── .env              # Environment configuration
├── package.json      # Dependencies and scripts
└── Server.js         # Main application entry point
```

## Database Models

### User Model
- Profile information (name, email, age, gender, bio)
- Authentication (password hashing, JWT)
- Photos with main photo selection
- Location with geospatial indexing
- Matching preferences (age range, distance, gender)
- Swipe history tracking
- Match relationships

### Match Model
- Two-user relationship tracking
- Message history references
- Last activity timestamps
- Unmatch functionality
- Match statistics

### Message Model
- Multi-type messages (text, image, GIF, emoji)
- Read receipts and delivery status
- Reply threading
- Soft deletion
- Real-time synchronization

## Security Features

- JWT authentication with secure token handling
- Password hashing with bcrypt (12 rounds)
- Rate limiting to prevent abuse
- CORS configuration for cross-origin requests
- Helmet for security headers
- Input validation and sanitization
- MongoDB injection protection

## Development Notes

### Current Status
✅ **Server is running successfully on port 3000**  
⚠️ **MongoDB connection issue**: IP address needs to be whitelisted in Atlas

To resolve MongoDB connection:
1. Go to MongoDB Atlas dashboard
2. Navigate to Network Access
3. Add your current IP address to the whitelist
4. Restart the server

### Performance Optimizations
- Database indexing for efficient queries
- Geospatial indexing for location-based matching
- Connection pooling with Mongoose
- Rate limiting for API protection
- Efficient pagination for large datasets

### Real-time Features
- Socket.IO for instant messaging
- Typing indicators
- Read receipts
- Match notifications
- Online/offline status tracking

## Testing the API

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Tinder V2 API is running",
  "timestamp": "2025-09-28T09:46:22.428Z"
}
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure IP is whitelisted in MongoDB Atlas
   - Check network connectivity
   - Verify username/password in connection string

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes on port 3000

3. **JWT Token Issues**
   - Update JWT_SECRET in production
   - Check token expiration settings

4. **CORS Issues**
   - Update FRONTEND_URL in `.env`
   - Check CORS configuration in server

## Production Deployment

1. **Environment Variables**
   - Update JWT_SECRET with strong random string
   - Set NODE_ENV=production
   - Configure proper FRONTEND_URL

2. **Security**
   - Enable HTTPS
   - Configure proper CORS origins
   - Set up monitoring and logging
   - Regular security updates

3. **Database**
   - Use MongoDB Atlas production tier
   - Configure proper backup strategy
   - Monitor performance metrics

## License

This project is licensed under the ISC License.

---

**Server Status**: ✅ Running on http://localhost:3000  
**API Documentation**: Available at http://localhost:3000/api/health  
**WebSocket**: Available at ws://localhost:3000  

For questions or issues, please check the troubleshooting section above.
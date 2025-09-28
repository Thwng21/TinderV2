const mongoose = require('mongoose');
const User = require('../Models/User');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@tinderv2.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@tinderv2.com',
      password: 'admin123', // Will be hashed by the pre-save middleware
      age: 30,
      gender: 'other',
      interestedIn: 'both',
      role: 'admin',
      bio: 'System Administrator',
      location: {
        city: 'Ho Chi Minh City',
        country: 'Vietnam',
        coordinates: [106.6297, 10.8231]
      }
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@tinderv2.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('🆔 ID:', adminUser._id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createAdminUser();
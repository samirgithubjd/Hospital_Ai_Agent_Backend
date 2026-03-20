const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const bootstrapAdmin = async () => {
  try {
    console.log('🔧 Starting admin bootstrap...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@hospital.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Active: ${existingAdmin.isActive}\n`);
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin account
    const adminData = {
      email: 'admin@hospital.com',
      username: 'admin_system',
      password: 'admin123', // Will be hashed by User model pre-save hook
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+1-000-000-0000',
      isActive: true
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Admin account created successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.isActive ? 'Active' : 'Inactive'}\n`);

    console.log('🧪 You can now test login with:');
    console.log(`   curl -X POST http://localhost:5000/api/auth/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"admin@hospital.com","password":"admin123"}'\n`);

    await mongoose.disconnect();
    console.log('✅ Bootstrap complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    console.error(error);
    
    try {
      await mongoose.disconnect();
    } catch (e) {}
    
    process.exit(1);
  }
};

// Run bootstrap
bootstrapAdmin();

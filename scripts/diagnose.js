const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const diagnose = async () => {
  try {
    console.log('\n🔍 DIAGNOSIS REPORT\n');
    console.log('='.repeat(60));

    // Check environment
    console.log('\n1️⃣  Environment Check:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ NOT SET'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

    // Connect to database
    console.log('\n2️⃣  Database Connection:');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ Connected to MongoDB');

    // Check existing users
    console.log('\n3️⃣  Existing Users in Database:');
    const allUsers = await User.find({}, 'email role username isActive');
    if (allUsers.length === 0) {
      console.log('   ℹ️  No users found in database');
    } else {
      console.log(`   Found ${allUsers.length} user(s):`);
      allUsers.forEach(user => {
        console.log(`     • ${user.email} (${user.role}) - Active: ${user.isActive}`);
      });
    }

    // Check if admin exists
    console.log('\n4️⃣  Admin Status:');
    const admin = await User.findOne({ email: 'admin@hospital.com' });
    if (admin) {
      console.log('   ✅ Admin exists');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Password hash: ${admin.password ? admin.password.substring(0, 20) + '...' : 'undefined'}`);

      // Test password comparison
      console.log('\n5️⃣  Password Verification:');
      try {
        const isValid = await admin.comparePassword('admin123');
        console.log(`   Password 'admin123': ${isValid ? '✅ CORRECT' : '❌ INCORRECT'}`);
      } catch (error) {
        console.log(`   ❌ Password comparison failed: ${error.message}`);
      }
    } else {
      console.log('   ❌ Admin does NOT exist - creating now...\n');

      const newAdmin = new User({
        email: 'admin@hospital.com',
        username: 'admin_system',
        password: 'admin123',
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+1-000-000-0000',
        isActive: true
      });

      await newAdmin.save();
      console.log('   ✅ Admin created successfully!');
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Password: admin123`);
    }

    // Test credentials
    console.log('\n6️⃣  Login Test:');
    const testUser = await User.findOne({ email: 'admin@hospital.com' });
    if (testUser) {
      const isPasswordValid = await testUser.comparePassword('admin123');
      console.log(`   Password verification: ${isPasswordValid ? '✅ PASS' : '❌ FAIL'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Now try logging in with:');
    console.log('   Email: admin@hospital.com');
    console.log('   Password: admin123\n');
    console.log('   curl command:');
    console.log(`   curl -X POST http://localhost:5000/api/auth/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"admin@hospital.com","password":"admin123"}'\n`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    console.error(error);
    
    try {
      await mongoose.disconnect();
    } catch (e) {}
    
    process.exit(1);
  }
};

diagnose();

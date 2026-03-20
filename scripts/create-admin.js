const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const createOrUpdateAdmin = async () => {
  try {
    console.log('\n🔐 Creating/Updating Admin Account\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Admin credentials
    const adminEmail = 'admin1@hospital.com';
    const adminPassword = 'Admin@123456';

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`⚠️  Admin exists. Updating password...\n`);
      admin.password = adminPassword;
      await admin.save();
      console.log('✅ Password updated!\n');
    } else {
      console.log(`📝 Creating new admin account...\n`);
      
      admin = new User({
        email: adminEmail,
        username: 'admin1_system',
        password: adminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin account created!\n');
    }

    // Verify the password works
    const isPasswordValid = await admin.comparePassword(adminPassword);
    console.log(`✅ Password verification: ${isPasswordValid ? 'PASS ✓' : 'FAIL ✗'}\n`);

    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive}\n`);

    console.log('🧪 Test with curl:');
    console.log(`   curl -X POST http://localhost:5000/api/auth/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{`);
    console.log(`       "email": "${adminEmail}",`);
    console.log(`       "password": "${adminPassword}"`);
    console.log(`     }'\n`);

    await mongoose.disconnect();
    console.log('✅ Done!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    
    try {
      await mongoose.disconnect();
    } catch (e) {}
    
    process.exit(1);
  }
};

createOrUpdateAdmin();

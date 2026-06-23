// create-admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./netlify/functions/models/Admin.cjs');

async function createAdmin() {
  await mongoose.connect('your_mongodb_uri');
  
  const hashedPassword = await bcrypt.hash('your_password', 10);
  
  const admin = await Admin.create({
    email: 'admin@example.com',
    password: hashedPassword
  });
  
  console.log('Admin oluşturuldu:', admin);
  process.exit();
}

createAdmin();
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27015/srcc');
    console.log('Connected to MongoDB');
    
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', UserSchema, 'users');
    
    const users = await User.find({}, 'email firstName lastName roles status permissions').lean();
    console.log('All Users in DB:');
    console.log(JSON.stringify(users, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

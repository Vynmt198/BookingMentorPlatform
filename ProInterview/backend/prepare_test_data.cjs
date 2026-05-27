const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prointerview');
  const Booking = mongoose.model('Booking', new mongoose.Schema({ 
    timeSlot: String, 
    status: String, 
    date: String, 
    reviewId: mongoose.Schema.Types.ObjectId 
  }));

  // 1. Set one to confirmed (14:00)
  const b1 = await Booking.findOne({ timeSlot: '14:00' });
  if (b1) {
    b1.status = 'confirmed';
    b1.date = '16/05';
    b1.reviewId = undefined;
    await b1.save();
    console.log('Booking 1 (14:00) -> confirmed');
  }

  // 2. Set another one to completed
  const b2 = await Booking.findOne({ status: { $ne: 'confirmed' }, _id: { $ne: b1?._id } });
  if (b2) {
    b2.status = 'completed';
    b2.date = '16/05';
    b2.reviewId = undefined;
    await b2.save();
    console.log('Booking 2 -> completed');
  }

  process.exit();
}

run();

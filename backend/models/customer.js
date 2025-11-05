const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AddressSchema = new mongoose.Schema({
  address_label: { type: String, default: 'Home'},
  street_address: { type: String, required: true},
  city: { type: String, required: true },
  state: { type: String, required: true },
  pin: { type: String, required: true },
  contact_phone: String
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  phone:      { type: String, required: true},
  dob:        { type: Date,   required: true },
  gender:     { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  password:   { type: String, required: true},
  addresses: [AddressSchema]
}, { timestamps: true });


// Virtual for formatted member_since (using createdAt timestamp)
CustomerSchema.virtual('memberSince').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
});

// Virtual for formatted DOB (display purpose)
CustomerSchema.virtual('formattedDob').get(function() {
  if (!this.dob) return null;
  return this.dob.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});


CustomerSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

CustomerSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

CustomerSchema.methods.updatePassword = async function(newPassword) {
    this.password = newPassword;
    await this.save();
};


module.exports = mongoose.model('Customer', CustomerSchema);
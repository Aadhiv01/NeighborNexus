const mongoose = require('mongoose');

const USER_TYPES = ['Community Member', 'Service Provider'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never returned by default. Callers must explicitly .select('+password').
    password: { type: String, required: true, select: false },
    type: { type: String, enum: USER_TYPES, required: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id, name: this.name, email: this.email, type: this.type };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.USER_TYPES = USER_TYPES;

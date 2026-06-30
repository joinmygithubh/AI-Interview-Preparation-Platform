import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    targetRole: {
      type: String,
      default: '',
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ['junior', 'mid', 'senior'],
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    avgScore: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    // createdAt is defined explicitly above; keep updatedAt automatic.
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Hash the password before saving when it has been set/modified.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Compare a plaintext password against the stored hash.
 * @param {string} plain
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

/**
 * Generate a signed JWT for this user.
 * @returns {string}
 */
userSchema.methods.generateAuthToken = function generateAuthToken() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Never leak the password hash in JSON responses.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;

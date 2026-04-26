const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be under 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password by default
    },
    role: {
      type: String,
      enum: ['founder', 'investor', 'admin'],
      default: 'investor',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must be under 500 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Startup',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    interests: [
      {
        type: String,
        enum: ['AI / ML', 'Fintech', 'Health', 'Climate', 'SaaS', 'Consumer', 'EdTech', 'Web3'],
      },
    ],
    dealFlow: [
      {
        startup: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup' },
        status: { 
          type: String, 
          enum: ['Interested', 'In Diligence', 'Invested', 'Passed'],
          default: 'Interested'
        },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: Date.now }
      }
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: startups owned by this user
userSchema.virtual('startups', {
  ref: 'Startup',
  localField: '_id',
  foreignField: 'founder',
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: public profile (no sensitive fields)
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    bio: this.bio,
    avatar: this.avatar,
    website: this.website,
    location: this.location,
    bookmarks: this.bookmarks,
    interests: this.interests,
    dealFlow: this.dealFlow,
    isVerified: this.isVerified,
    createdAt: this.createdAt,
  };
};

// Index for fast lookups
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);

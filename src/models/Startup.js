const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Startup name is required'],
      trim: true,
      maxlength: [100, 'Name must be under 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    tagline: {
      type: String,
      required: [true, 'Tagline is required'],
      trim: true,
      maxlength: [160, 'Tagline must be under 160 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description must be under 5000 characters'],
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      enum: ['AI / ML', 'Fintech', 'Health', 'Climate', 'SaaS', 'Consumer', 'EdTech', 'Web3', 'Other'],
    },
    fundingStage: {
      type: String,
      required: [true, 'Funding stage is required'],
      enum: ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'],
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    pitchDeckUrl: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    founder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String, trim: true }],
    metrics: {
      mrr: { type: Number, default: 0 },
      users: { type: Number, default: 0 },
      growth: { type: String, default: '' },
    },
    socialLinks: {
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: like count
startupSchema.virtual('likeCount').get(function () {
  return (this.likes || []).length;
});

// Virtual: comments (populated separately)
startupSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'startup',
});

// Auto-generate slug from name
startupSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();
  const base = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  let slug = base;
  let count = 0;
  while (await mongoose.model('Startup').findOne({ slug, _id: { $ne: this._id } })) {
    count++;
    slug = `${base}-${count}`;
  }
  this.slug = slug;
  next();
});

// Indexes
startupSchema.index({ name: 'text', tagline: 'text', description: 'text' });
startupSchema.index({ industry: 1 });
startupSchema.index({ fundingStage: 1 });
startupSchema.index({ founder: 1 });
startupSchema.index({ createdAt: -1 });
startupSchema.index({ views: -1 });

module.exports = mongoose.model('Startup', startupSchema);

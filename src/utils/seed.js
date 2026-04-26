const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Startup = require('../models/Startup');
const Comment = require('../models/Comment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stackd';

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([User.deleteMany(), Startup.deleteMany(), Comment.deleteMany()]);
  console.log('🗑️  Cleared existing data');

  // Create users
  const userData = [
    { name: 'Alex Rivera', email: 'founder@stackd.dev', password: 'password123', role: 'founder', bio: 'Serial entrepreneur. Building the future of AI.' },
    { name: 'Sam Chen', email: 'investor@stackd.dev', password: 'password123', role: 'investor', bio: 'Partner at Horizon Ventures. Investing in B2B SaaS and climate tech.' },
    { name: 'Admin User', email: 'admin@stackd.dev', password: 'password123', role: 'admin', bio: 'Platform administrator.' },
    { name: 'Jordan Park', email: 'jordan@stackd.dev', password: 'password123', role: 'founder', bio: 'Fintech founder. Former Goldman Sachs.' },
    { name: 'Maya Singh', email: 'maya@stackd.dev', password: 'password123', role: 'investor', bio: 'Angel investor. Early backer of 40+ startups.' },
  ];
  
  const users = [];
  for (const u of userData) {
    users.push(await User.create(u));
  }
  console.log(`👤 Created ${users.length} users`);

  const [founder1, investor1, , founder2] = users;

  // Create startups
  const startupData = [
    {
      name: 'NeuralDraft',
      tagline: 'AI writes your entire marketing stack in 60 seconds',
      description: 'NeuralDraft uses fine-tuned LLMs to generate full marketing campaigns — copy, visuals, A/B tests — from a single brief. Trusted by 400+ growth teams at companies like Notion and Linear.',
      industry: 'AI / ML',
      fundingStage: 'Seed',
      location: 'San Francisco, CA',
      founder: founder1._id,
      views: 3241,
      website: 'https://neuraldraft.io',
      metrics: { mrr: 42000, users: 1200, growth: '18% MoM' },
    },
    {
      name: 'GreenLedger',
      tagline: 'Carbon accounting for teams who care',
      description: 'GreenLedger integrates with QuickBooks and Xero to automatically calculate, track, and offset your company carbon footprint with verified credits. ISO-certified and deployed in 200+ businesses.',
      industry: 'Climate',
      fundingStage: 'Series A',
      location: 'London, UK',
      founder: founder1._id,
      views: 1872,
      website: 'https://greenledger.co',
      metrics: { mrr: 89000, users: 340, growth: '22% MoM' },
    },
    {
      name: 'MedFlow',
      tagline: 'Patient intake that makes nurses love Mondays',
      description: 'Replacing paper clipboards with voice-first intake that automatically fills EHR fields. HIPAA-compliant and deployed in 60+ clinics across Texas and Florida.',
      industry: 'Health',
      fundingStage: 'Seed',
      location: 'Austin, TX',
      founder: founder2._id,
      views: 2104,
      website: 'https://medflow.health',
      metrics: { mrr: 28000, users: 65, growth: '31% MoM' },
    },
    {
      name: 'StudioKit',
      tagline: 'Notion for creative agencies',
      description: 'Project management and client collaboration built for design studios. Timeline, invoice, and asset library all in one workspace. Used by 500+ agencies worldwide.',
      industry: 'SaaS',
      fundingStage: 'Pre-seed',
      location: 'Berlin, Germany',
      founder: founder2._id,
      views: 1453,
      website: 'https://studiokit.app',
      metrics: { mrr: 8000, users: 520, growth: '14% MoM' },
    },
    {
      name: 'FlexFi',
      tagline: 'Buy now, invest the rest',
      description: 'BNPL that routes your spare change into index funds automatically. Gen Z\'s first wealth-building credit product. 50,000+ users in beta, $2.1M transacted.',
      industry: 'Fintech',
      fundingStage: 'Seed',
      location: 'New York, NY',
      founder: founder1._id,
      views: 4102,
      website: 'https://flexfi.money',
      metrics: { mrr: 15000, users: 50000, growth: '41% MoM' },
    },
    {
      name: 'LearnLoop',
      tagline: 'Adaptive courses that rewrite themselves weekly',
      description: 'LLM-powered curriculum that analyzes your learning gaps and restructures course content in real-time. 2.3x completion rates vs traditional platforms. Piloting with 3 universities.',
      industry: 'EdTech',
      fundingStage: 'Idea',
      location: 'Remote',
      founder: founder2._id,
      views: 892,
      website: 'https://learnloop.ai',
      metrics: { mrr: 0, users: 300, growth: 'Pre-revenue' },
    },
  ];

  const startups = [];
  for (const s of startupData) {
    startups.push(await Startup.create(s));
  }
  console.log(`🚀 Created ${startups.length} startups`);

  // Seed some likes
  await Startup.findByIdAndUpdate(startups[0]._id, { $push: { likes: { $each: [investor1._id, users[4]._id] } } });
  await Startup.findByIdAndUpdate(startups[4]._id, { $push: { likes: { $each: [investor1._id] } } });

  // Seed some comments
  await Comment.insertMany([
    { content: 'This is exactly what our growth team has been waiting for. The AI-generated A/B tests are surprisingly good.', user: investor1._id, startup: startups[0]._id },
    { content: 'How does it handle brand guidelines? Do you have a style-locking feature?', user: users[4]._id, startup: startups[0]._id },
    { content: 'We\'ve been using GreenLedger for 3 months. Saved us 40 hours/month on reporting.', user: investor1._id, startup: startups[1]._id },
    { content: 'Huge market. The regulatory tailwind in the EU alone makes this a winner.', user: users[4]._id, startup: startups[1]._id },
    { content: 'FlexFi is solving a real problem. BNPL without the debt trap is the future.', user: investor1._id, startup: startups[4]._id },
  ]);
  console.log('💬 Created sample comments');

  // Seed bookmarks for investor
  await User.findByIdAndUpdate(investor1._id, {
    $push: { bookmarks: { $each: [startups[0]._id, startups[4]._id] } },
  });
  console.log('🔖 Created sample bookmarks');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Demo accounts:');
  console.log('  Founder:  founder@stackd.dev  / password123');
  console.log('  Investor: investor@stackd.dev / password123');
  console.log('  Admin:    admin@stackd.dev    / password123');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

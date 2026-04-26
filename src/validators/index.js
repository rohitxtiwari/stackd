const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  req.body = value;
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(80).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(100).required(),
    role: Joi.string().valid('founder', 'investor').default('investor'),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createStartup: Joi.object({
    name: Joi.string().max(100).required(),
    tagline: Joi.string().max(160).required(),
    description: Joi.string().max(5000).required(),
    industry: Joi.string()
      .valid('AI / ML', 'Fintech', 'Health', 'Climate', 'SaaS', 'Consumer', 'EdTech', 'Web3', 'Other')
      .required(),
    fundingStage: Joi.string()
      .valid('Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+')
      .required(),
    location: Joi.string().max(100).default('Remote'),
    website: Joi.string().uri().allow('').optional(),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    metrics: Joi.object({
      mrr: Joi.number().min(0).optional(),
      users: Joi.number().min(0).optional(),
      growth: Joi.string().max(50).optional(),
    }).optional(),
    socialLinks: Joi.object({
      twitter: Joi.string().uri().allow('').optional(),
      linkedin: Joi.string().uri().allow('').optional(),
      github: Joi.string().uri().allow('').optional(),
    }).optional(),
  }),

  updateStartup: Joi.object({
    name: Joi.string().max(100).optional(),
    tagline: Joi.string().max(160).optional(),
    description: Joi.string().max(5000).optional(),
    industry: Joi.string()
      .valid('AI / ML', 'Fintech', 'Health', 'Climate', 'SaaS', 'Consumer', 'EdTech', 'Web3', 'Other')
      .optional(),
    fundingStage: Joi.string()
      .valid('Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+')
      .optional(),
    location: Joi.string().max(100).optional(),
    website: Joi.string().uri().allow('').optional(),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    isPublished: Joi.boolean().optional(),
    metrics: Joi.object({
      mrr: Joi.number().min(0).optional(),
      users: Joi.number().min(0).optional(),
      growth: Joi.string().max(50).optional(),
    }).optional(),
  }),

  postComment: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    parentComment: Joi.string().hex().length(24).optional(),
  }),

  sendMessage: Joi.object({
    recipientId: Joi.string().hex().length(24).required(),
    startupId: Joi.string().hex().length(24).optional(),
    subject: Joi.string().max(200).optional(),
    content: Joi.string().min(1).max(5000).required(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(80).optional(),
    bio: Joi.string().max(500).allow('').optional(),
    website: Joi.string().uri().allow('').optional(),
    location: Joi.string().max(100).allow('').optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(100).required(),
  }),
};

module.exports = { validate, schemas };

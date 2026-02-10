import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    permissions: { type: [String], default: [] },
  },
  { _id: false }
);

const apiKeySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    keyLast4: { type: String, required: true },
    scopes: { type: [String], default: [] },
    hash: { type: String, required: true, select: false },
    createdAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { _id: false }
);

const fundingWalletSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    asset: { type: String, required: true },
    network: { type: String, required: true },
    label: { type: String, required: true },
    address: { type: String, required: true },
  },
  { _id: false }
);

const newsItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    imageUrl: { type: String, default: '' },
  },
  { _id: false }
);

const chatFaqSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const promotionSchema = new mongoose.Schema(
  {
    message: { type: String, default: '' },
    targetPath: { type: String, default: '/messages' },
    enabled: { type: Boolean, default: false },
    targetAll: { type: Boolean, default: true },
    targetUserIds: { type: [String], default: [] },
    history: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true },
            title: { type: String, default: 'Promotion' },
            message: { type: String, required: true },
            targetPath: { type: String, default: '/messages' },
            targetAll: { type: Boolean, default: true },
            targetUserIds: { type: [String], default: [] },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const adminSettingsSchema = new mongoose.Schema(
  {
    rbacEnabled: { type: Boolean, default: false },
    roles: { type: [roleSchema], default: [] },
    security: {
      require2fa: { type: Boolean, default: false },
      ipWhitelist: { type: [String], default: [] },
    },
    notifications: {
      newUsers: { type: Boolean, default: true },
      largeWithdrawals: { type: Boolean, default: true },
      flaggedTrades: { type: Boolean, default: true },
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'We are performing maintenance. Please try again later.' },
    },
    news: {
      title: { type: String, default: 'Market News' },
      url: { type: String, default: 'https://www.coindesk.com/' },
      items: { type: [newsItemSchema], default: [] },
    },
    chatFaqs: { type: [chatFaqSchema], default: [] },
    promotion: { type: promotionSchema, default: () => ({}) },
    funding: {
      wallets: { type: [fundingWalletSchema], default: [] },
    },
    apiKeys: { type: [apiKeySchema], default: [] },
    ui: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    },
  },
  { timestamps: true }
);

const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    permissions: [
      'view_dashboard',
      'manage_users',
      'manage_trades',
      'manage_financials',
      'manage_kyc',
      'manage_support',
      'view_logs',
      'manage_settings',
      'manage_admins',
    ],
  },
  {
    name: 'Admin',
    permissions: [
      'view_dashboard',
      'manage_users',
      'manage_trades',
      'manage_financials',
      'manage_kyc',
      'manage_support',
      'view_logs',
    ],
  },
  {
    name: 'Moderator',
    permissions: [
      'view_dashboard',
      'view_support',
      'view_logs',
    ],
  },
];

adminSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ roles: DEFAULT_ROLES });
  } else if (!settings.roles || settings.roles.length === 0) {
    settings.roles = DEFAULT_ROLES;
    await settings.save();
  } else {
    const roleMap = new Map(DEFAULT_ROLES.map(role => [role.name.toLowerCase(), role]));
    let updated = false;
    settings.roles = settings.roles.map((role: any) => {
      const template = roleMap.get(role.name?.toLowerCase());
      if (!template) return role;
      const merged = Array.from(new Set([...(role.permissions || []), ...template.permissions]));
      if (merged.length !== (role.permissions || []).length) {
        updated = true;
      }
      return { ...role, permissions: merged };
    });
    if (updated) {
      await settings.save();
    }
  }
  if (!settings.funding || !Array.isArray(settings.funding.wallets)) {
    settings.funding = { wallets: [] };
    await settings.save();
  }
  if (!settings.news || typeof settings.news !== 'object') {
    settings.news = {
      title: 'Market News',
      url: 'https://www.coindesk.com/',
      items: [
        {
          id: 'news-default',
          title: 'Market News',
          url: 'https://www.coindesk.com/',
          imageUrl: '',
        },
      ],
    };
    await settings.save();
  } else if (!Array.isArray(settings.news.items) || settings.news.items.length === 0) {
    settings.news.items = [
      {
        id: 'news-default',
        title: settings.news.title || 'Market News',
        url: settings.news.url || 'https://www.coindesk.com/',
        imageUrl: '',
      },
    ];
    await settings.save();
  }
  if (!Array.isArray(settings.chatFaqs) || settings.chatFaqs.length === 0) {
    settings.chatFaqs = [
      {
        id: 'faq-verify-time',
        question: 'How long does deposit verification take?',
        answer: 'Most deposits are reviewed within 5 to 30 minutes after submission.',
      },
      {
        id: 'faq-withdraw-status',
        question: 'How do I check my withdrawal status?',
        answer: 'Open Wallet > Transactions and check the request status there.',
      },
      {
        id: 'faq-security',
        question: 'What should I do if my account is locked?',
        answer: 'Use Change Password and contact support with your UID if access is still blocked.',
      },
    ];
    await settings.save();
  }
  if (!settings.promotion || typeof settings.promotion !== 'object') {
    settings.promotion = {
      message: '',
      targetPath: '/messages',
      enabled: false,
      targetAll: true,
      targetUserIds: [],
      history: [],
      updatedAt: null,
    };
    await settings.save();
  } else {
    let promotionUpdated = false;
    if (typeof settings.promotion.targetAll !== 'boolean') {
      settings.promotion.targetAll = true;
      promotionUpdated = true;
    }
    if (!Array.isArray(settings.promotion.targetUserIds)) {
      settings.promotion.targetUserIds = [];
      promotionUpdated = true;
    }
    if (!Array.isArray(settings.promotion.history)) {
      settings.promotion.history = [];
      promotionUpdated = true;
    }
    if (promotionUpdated) {
      await settings.save();
    }
  }
  return settings;
};

export default mongoose.models.AdminSettings || mongoose.model('AdminSettings', adminSettingsSchema);

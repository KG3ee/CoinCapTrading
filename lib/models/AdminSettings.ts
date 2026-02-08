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
    apiKeys: { type: [apiKeySchema], default: [] },
    ui: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    },
  },
  { timestamps: true }
);

const DEFAULT_ROLES = [
  { name: 'Super Admin', permissions: ['manage_users', 'manage_trades', 'view_logs', 'manage_settings'] },
  { name: 'Admin', permissions: ['manage_users', 'manage_trades', 'view_logs'] },
  { name: 'Moderator', permissions: ['view_logs', 'manage_trades'] },
];

adminSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ roles: DEFAULT_ROLES });
  } else if (!settings.roles || settings.roles.length === 0) {
    settings.roles = DEFAULT_ROLES;
    await settings.save();
  }
  return settings;
};

export default mongoose.models.AdminSettings || mongoose.model('AdminSettings', adminSettingsSchema);

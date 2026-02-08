import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'moderator'],
      default: 'admin',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    keyHash: { type: String, required: true, select: false, index: true },
    keyLast4: { type: String, required: true },
    isRoot: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: null },
    lastActiveIp: { type: String, default: '' },
    uiTheme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    createdByName: { type: String, default: '' },
    createdByRole: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

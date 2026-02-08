import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: '',
    },
    userEmail: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      default: 0,
    },
    oldBalance: {
      type: Number,
      default: 0,
    },
    newBalance: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: '',
    },
    actor: {
      type: String,
      default: 'admin',
    },
    actorName: {
      type: String,
      default: '',
    },
    actorRole: {
      type: String,
      default: '',
    },
    targetType: {
      type: String,
      default: '',
      index: true,
    },
    targetId: {
      type: String,
      default: '',
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', adminAuditLogSchema);

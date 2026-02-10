import mongoose from 'mongoose';

const fundingRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdraw'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    asset: {
      type: String,
      default: 'USDT',
      uppercase: true,
    },
    method: {
      type: String,
      default: 'manual',
    },
    network: {
      type: String,
      default: 'TRC20',
      uppercase: true,
    },
    platformWalletId: {
      type: String,
      default: '',
    },
    platformWalletAddress: {
      type: String,
      default: '',
    },
    senderWalletAddress: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    proofImageData: {
      type: String,
      default: '',
    },
    proofImageName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reason: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
  },
  { timestamps: true }
);

fundingRequestSchema.index({ userId: 1, createdAt: -1 });
fundingRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.FundingRequest || mongoose.model('FundingRequest', fundingRequestSchema);

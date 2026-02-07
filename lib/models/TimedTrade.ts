import mongoose from 'mongoose';

const timedTradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    cryptoSymbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [100, 'Minimum amount is 100 USDT'],
    },
    period: {
      type: Number,
      required: true,
      enum: [30, 60, 90, 120, 180, 300, 600],
    },
    profitPercent: {
      type: Number,
      required: true,
    },
    result: {
      type: String,
      enum: ['win', 'lose', 'pending'],
      default: 'pending',
    },
    profitAmount: {
      type: Number,
      default: 0,
    },
    // Backend toggle: if true, force a specific result
    forcedResult: {
      type: String,
      enum: ['win', 'lose', null],
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    transactionId: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

timedTradeSchema.index({ userId: 1, createdAt: -1 });
timedTradeSchema.index({ status: 1, resolvedAt: 1 });

export default mongoose.models.TimedTrade || mongoose.model('TimedTrade', timedTradeSchema);

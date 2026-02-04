import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    accountBalance: {
      type: Number,
      default: 10000,
    },
    totalInvested: {
      type: Number,
      default: 0,
    },
    totalReturns: {
      type: Number,
      default: 0,
    },
    holdings: [
      {
        cryptoSymbol: {
          type: String,
          required: true,
          uppercase: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        averageBuyPrice: {
          type: Number,
          required: true,
        },
        currentPrice: {
          type: Number,
          required: true,
        },
        totalValue: {
          type: Number,
          required: true,
        },
        gainLoss: {
          type: Number,
          required: true,
        },
        gainLossPercent: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);

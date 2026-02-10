import mongoose from 'mongoose';

interface ITradeSettings {
  _id: string;
  globalMode: 'random' | 'all_win' | 'all_lose';
  winRatePercent: number;
  userOverrides: Map<string, string>;
  userWinStreaks: Map<string, {
    remainingWins: number;
    fallbackMode: 'lose' | 'global';
  }>;
}

interface TradeSettingsModel extends mongoose.Model<ITradeSettings> {
  getSettings(): Promise<ITradeSettings & mongoose.Document>;
}

const tradeSettingsSchema = new mongoose.Schema<ITradeSettings>(
  {
    // Singleton key — only one document exists
    _id: {
      type: String,
      default: 'global',
    },

    // Global mode: 'random' | 'all_win' | 'all_lose'
    globalMode: {
      type: String,
      enum: ['random', 'all_win', 'all_lose'],
      default: 'random',
    },

    // Win rate percentage (0-100) — used when globalMode is 'random'
    // Default 50 means 50/50 chance
    winRatePercent: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Per-user overrides: { odbc: 'win' | 'lose' | null }
    // Set a specific user to always win or lose (overrides global)
    userOverrides: {
      type: Map,
      of: {
        type: String,
        enum: ['win', 'lose'],
      },
      default: {},
    },
    userWinStreaks: {
      type: Map,
      of: new mongoose.Schema(
        {
          remainingWins: {
            type: Number,
            min: 0,
            default: 0,
          },
          fallbackMode: {
            type: String,
            enum: ['lose', 'global'],
            default: 'global',
          },
        },
        { _id: false }
      ),
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Always return the singleton
tradeSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findById('global');
  if (!settings) {
    settings = await this.create({ _id: 'global' });
  }
  return settings;
};

export default (mongoose.models.TradeSettings as unknown as TradeSettingsModel) || mongoose.model<ITradeSettings, TradeSettingsModel>('TradeSettings', tradeSettingsSchema);

import TradeSettings from '@/lib/models/TradeSettings';
import { logger } from '@/lib/utils/logger';

const log = logger.child({ module: 'TradeDefaults' });

export async function applyDefaultNewUserTradeOverride(userId: string) {
  try {
    if (!userId) return;
    const settings = await TradeSettings.getSettings();
    if (!settings.userOverrides?.get(userId)) {
      settings.userOverrides.set(userId, 'lose');
      await settings.save();
    }
  } catch (error: any) {
    log.warn({ error, userId }, 'Failed to apply default new-user trade override');
  }
}

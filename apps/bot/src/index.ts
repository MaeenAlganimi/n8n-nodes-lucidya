import { Bot, InlineKeyboard } from 'grammy';
import { createBarqApp, type BarqApp } from '@barq/db';
import { copy, botLocale, type BotLocale } from './copy';
import {
  areaButtons,
  areaTitle,
  cityButtons,
  countryButtons,
  kindButtons,
  parseCallback,
  thresholdButtons,
  type AreaRef,
  type Button,
} from './flow';

function keyboard(buttons: Button[]): InlineKeyboard {
  const keys = new InlineKeyboard();
  buttons.forEach((button, index) => {
    if (index > 0) keys.row();
    keys.text(button.text, button.data);
  });
  return keys;
}

async function localeFor(app: BarqApp, chatId: string, languageCode: string | undefined): Promise<BotLocale> {
  const stored = await app.repo.getChat(chatId);
  return botLocale(languageCode, stored?.locale ?? null);
}

function refs(areas: Awaited<ReturnType<BarqApp['repo']['listAreas']>>): AreaRef[] {
  return areas.map((area) => ({
    id: area.id,
    countryCode: area.countryCode,
    cityId: area.cityId,
    countryNameEn: area.countryNameEn,
    countryNameAr: area.countryNameAr,
    cityNameEn: area.cityNameEn,
    cityNameAr: area.cityNameAr,
    nameEn: area.nameEn,
    nameAr: area.nameAr,
  }));
}

async function sendAlerts(bot: Bot, app: BarqApp): Promise<void> {
  const subscriptions = await app.repo.listSubscriptions();
  const byId = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const areas = new Map((await app.repo.listAreas()).map((area) => [area.id, area]));
  const { alerts, updates } = await app.collectAlerts();
  const failed = new Set<string>();
  for (const alert of alerts) {
    const subscription = byId.get(alert.subscriptionId);
    const area = subscription ? areas.get(subscription.areaId) : undefined;
    if (!subscription || !area) continue;
    const locale = subscription.locale === 'ar' ? 'ar' : 'en';
    const name = areaTitle(area, locale);
    const text =
      alert.type === 'prediction'
        ? copy[locale].prediction(name, Math.round(alert.probability * 100))
        : copy[locale].powerBack(name);
    try {
      await bot.api.sendMessage(subscription.chatId, text);
    } catch (error) {
      failed.add(alert.subscriptionId);
      console.error('Alert was not delivered', error);
    }
  }
  for (const update of updates) {
    if (failed.has(update.subscriptionId)) continue;
    await app.repo.updateSubscription(update.subscriptionId, {
      lastPredictionSlot: update.lastPredictionSlot ? new Date(update.lastPredictionSlot) : null,
      trackedOutageId: update.trackedOutageId,
    });
  }
}

export async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set. The map runs without it; start the bot when you have a token.');
    return;
  }
  const app = await createBarqApp();
  const bot = new Bot(token);
  let alerting = false;

  bot.command('start', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat.id), ctx.from?.language_code);
    await ctx.reply(`${copy[locale].start}\n\n${copy[locale].help}`);
  });

  bot.command('help', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat.id), ctx.from?.language_code);
    await ctx.reply(copy[locale].help);
  });

  bot.command('lang', async (ctx) => {
    const requested = ctx.match?.toString().trim().toLowerCase();
    const locale: BotLocale = requested === 'ar' ? 'ar' : 'en';
    await app.repo.upsertChat(String(ctx.chat.id), locale);
    await ctx.reply(copy[locale].langSet);
  });

  bot.command('report', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat.id), ctx.from?.language_code);
    const buttons = countryButtons(refs(await app.repo.listAreas()), locale, 'report');
    await ctx.reply(copy[locale].chooseCountry, { reply_markup: keyboard(buttons) });
  });

  bot.command('subscribe', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat.id), ctx.from?.language_code);
    const buttons = countryButtons(refs(await app.repo.listAreas()), locale, 'subscribe');
    await ctx.reply(copy[locale].chooseCountry, { reply_markup: keyboard(buttons) });
  });

  bot.command('unsubscribe', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat.id), ctx.from?.language_code);
    const subs = await app.repo.subscriptionsForChat(String(ctx.chat.id));
    if (subs.length === 0) {
      await ctx.reply(copy[locale].noSubs);
      return;
    }
    const areas = await app.repo.listAreas();
    const buttons = subs.flatMap((subscription) => {
      const area = areas.find((item) => item.id === subscription.areaId);
      if (!area) return [];
      return [{ text: `${copy[locale].unsubscribe}: ${areaTitle(area, locale)}`, data: `u:${area.id}` }];
    });
    await ctx.reply(copy[locale].yourSubs, { reply_markup: keyboard(buttons) });
  });

  bot.command('status', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat.id), ctx.from?.language_code);
    const active = await app.repo.listOutages({ statuses: ['confirmed'] });
    if (active.length === 0) {
      await ctx.reply(copy[locale].none);
      return;
    }
    const areas = await app.repo.listAreas();
    const lines = active.slice(0, 15).map((outage) => {
      const area = areas.find((item) => item.id === outage.areaId);
      return area ? areaTitle(area, locale) : outage.areaId;
    });
    await ctx.reply(lines.join('\n'));
  });

  bot.on('callback_query:data', async (ctx) => {
    const locale = await localeFor(app, String(ctx.chat?.id ?? ''), ctx.from.language_code);
    const action = parseCallback(ctx.callbackQuery.data);
    const areas = refs(await app.repo.listAreas());
    const reply = async (text: string, buttons?: Button[]) => {
      await ctx.reply(text, buttons ? { reply_markup: keyboard(buttons) } : undefined);
    };

    if (action.type === 'cities') {
      await reply(copy[locale].chooseCity, cityButtons(areas, locale, action.intent, action.countryCode));
    } else if (action.type === 'areas') {
      await reply(copy[locale].chooseArea, areaButtons(areas, locale, action.intent, action.cityId));
    } else if (action.type === 'kind') {
      await reply(copy[locale].chooseKind, kindButtons(action.areaId, locale));
    } else if (action.type === 'thresholds') {
      await reply(copy[locale].chooseThreshold, thresholdButtons(action.areaId));
    } else if (action.type === 'report') {
      const result = await app.ingest({
        areaId: action.areaId,
        kind: action.kind,
        reporterKey: app.hashReporter('telegram', String(ctx.from.id)),
        source: 'telegram',
      });
      const code = result.accepted ? result.code : result.code;
      await reply(copy[locale][code]);
    } else if (action.type === 'subscribe') {
      await app.subscribe({
        chatId: String(ctx.chat?.id ?? ctx.from.id),
        areaId: action.areaId,
        threshold: action.threshold,
        locale,
      });
      await reply(copy[locale].subscribed);
    } else if (action.type === 'unsubscribe') {
      await app.repo.deleteSubscription(String(ctx.chat?.id ?? ctx.from.id), action.areaId);
      await reply(copy[locale].unsubscribed);
    }
    await ctx.answerCallbackQuery();
  });

  const timer = setInterval(() => {
    if (alerting) return;
    alerting = true;
    void sendAlerts(bot, app)
      .catch((error: unknown) => console.error(error))
      .finally(() => {
        alerting = false;
      });
  }, 60_000);

  const stop = async () => {
    clearInterval(timer);
    await bot.stop();
    await app.close();
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
  await bot.start();
}

if (process.argv[1]?.includes(`${'apps'}/bot/src/index.`)) {
  void main();
}

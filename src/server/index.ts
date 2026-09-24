import 'dotenv/config';
import express from 'express';
import { ApiError, Environment, Paddle, type IUnitPriceOverride, type Price } from '@paddle/paddle-node-sdk';
import { getManagedCountryCodes, mergeOverrides } from '../lib/pricePayload';
import { readFxCache, refreshFxRates, validateFxCache } from './fxRates';
import {
  isPaddleCurrency,
  isPaddleEnvironment,
  type CatalogPriceSnapshot,
  type MoneyAmount,
  type PaddleEnvironment,
  type UnitPriceOverridePayload,
} from '../lib/paddleTypes';

const PORT = Number(process.env.PORT ?? 8787);

function requireEnv(): { apiKey: string; environment: PaddleEnvironment } {
  const apiKey = process.env.PADDLE_API_KEY?.trim();
  const environment = process.env.PADDLE_ENVIRONMENT?.trim() ?? '';

  if (!isPaddleEnvironment(environment)) {
    throw new Error(
      'PADDLE_ENVIRONMENT must be set to "sandbox" or "production". The Paddle SDK defaults to production if this is omitted.',
    );
  }

  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not set.');
  }

  return { apiKey, environment };
}

const { apiKey, environment } = requireEnv();

const paddle = new Paddle(apiKey, {
  environment: environment === 'sandbox' ? Environment.sandbox : Environment.production,
});

function serializePrice(price: Price): CatalogPriceSnapshot {
  return {
    id: price.id,
    productId: price.productId,
    name: price.name,
    description: price.description,
    status: price.status,
    unitPrice: {
      amount: price.unitPrice.amount,
      currencyCode: price.unitPrice.currencyCode,
    },
    unitPriceOverrides: price.unitPriceOverrides.map((override) => ({
      countryCodes: [...override.countryCodes],
      unitPrice: {
        amount: override.unitPrice.amount,
        currencyCode: override.unitPrice.currencyCode,
      },
    })),
  };
}

function isPriceId(value: string): boolean {
  return /^pri_[a-zA-Z0-9]+$/.test(value);
}

function parseMoney(value: unknown): MoneyAmount | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.amount !== 'string' || typeof record.currencyCode !== 'string') return null;
  if (!isPaddleCurrency(record.currencyCode)) return null;
  if (!/^\d+$/.test(record.amount)) return null;
  return { amount: record.amount, currencyCode: record.currencyCode };
}

function parseOverrides(value: unknown): UnitPriceOverridePayload[] | null {
  if (!Array.isArray(value)) return null;
  const overrides: UnitPriceOverridePayload[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    if (!Array.isArray(record.countryCodes) || record.countryCodes.some((code) => typeof code !== 'string')) {
      return null;
    }
    const unitPrice = parseMoney(record.unitPrice);
    if (!unitPrice) return null;
    overrides.push({
      countryCodes: record.countryCodes as string[],
      unitPrice,
    });
  }
  return overrides;
}

function errorStatus(error: unknown): number {
  if (error instanceof ApiError) {
    if (error.code === 'not_found' || error.detail.toLowerCase().includes('not found')) return 404;
    if (error.code === 'forbidden' || error.code === 'unauthorized') return 401;
    return 400;
  }
  return 500;
}

function errorPayload(error: unknown) {
  if (error instanceof ApiError) {
    return {
      error: error.detail,
      code: error.code,
      fields: error.errors,
    };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: 'Unknown error' };
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/config', (_req, res) => {
  res.json({ environment });
});

app.get('/api/fx-rates', async (_req, res) => {
  try {
    const cached = await readFxCache();
    if (cached === null) {
      res.status(404).json({ error: 'Exchange rates have not been fetched yet.' });
      return;
    }
    validateFxCache(cached);
    res.set('Cache-Control', 'no-store');
    res.type('json').send(cached);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read exchange rates.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/fx-rates', async (_req, res) => {
  try {
    const raw = await refreshFxRates();
    res.set('Cache-Control', 'no-store');
    res.type('json').send(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not fetch exchange rates.';
    const status = message === 'CURRENCYAPI_API_KEY is not set.' ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

app.get('/api/prices/:priceId', async (req, res) => {
  const { priceId } = req.params;
  if (!isPriceId(priceId)) {
    res.status(400).json({ error: 'Expected a Paddle price id (pri_...).' });
    return;
  }

  try {
    const price = await paddle.prices.get(priceId);
    res.json(serializePrice(price));
  } catch (error) {
    res.status(errorStatus(error)).json(errorPayload(error));
  }
});

app.post('/api/prices/:priceId/apply', async (req, res) => {
  const { priceId } = req.params;
  if (!isPriceId(priceId)) {
    res.status(400).json({ error: 'Expected a Paddle price id (pri_...).' });
    return;
  }

  if (environment === 'production' && req.body?.confirmProduction !== true) {
    res.status(403).json({
      error: 'This app is connected to production. Set confirmProduction to true after reviewing the warning.',
    });
    return;
  }

  const unitPrice = parseMoney(req.body?.unitPrice);
  const proposedOverrides = parseOverrides(req.body?.unitPriceOverrides);
  if (!unitPrice || !proposedOverrides) {
    res.status(400).json({ error: 'Request must include unitPrice and unitPriceOverrides.' });
    return;
  }

  try {
    const current = await paddle.prices.get(priceId);
    const existing: UnitPriceOverridePayload[] = current.unitPriceOverrides.map((override) => ({
      countryCodes: [...override.countryCodes],
      unitPrice: {
        amount: override.unitPrice.amount,
        currencyCode: override.unitPrice.currencyCode,
      },
    }));

    const unitPriceOverrides = mergeOverrides(existing, proposedOverrides, getManagedCountryCodes());

    const updated = await paddle.prices.update(priceId, {
      unitPrice,
      unitPriceOverrides: unitPriceOverrides.map((override) => ({
        countryCodes: override.countryCodes as IUnitPriceOverride['countryCodes'],
        unitPrice: override.unitPrice,
      })),
    });

    res.json({
      environment,
      price: serializePrice(updated),
    });
  } catch (error) {
    res.status(errorStatus(error)).json(errorPayload(error));
  }
});

app.listen(PORT, () => {
  console.log(`Paddle API server listening on http://127.0.0.1:${PORT} (${environment})`);
});

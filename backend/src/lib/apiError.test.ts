import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { describeError } from './apiError';

describe('describeError', () => {
  it('returns a fixed sentence for known Prisma request errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError('unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    expect(describeError(error, 'fallback')).toBe('A record with these details already exists.');
  });

  it('does not leak the code or message of an unmapped known request error', () => {
    const error = new Prisma.PrismaClientKnownRequestError('secret internal detail', {
      code: 'P9999',
      clientVersion: '5.0.0',
    });
    const result = describeError(error, 'fallback');
    expect(result).toBe('The request could not be completed.');
    expect(result).not.toContain('secret internal detail');
  });

  it('keeps only the offending argument for validation errors', () => {
    const error = new Prisma.PrismaClientValidationError(
      `\nInvalid \`prisma.inventoryItem.create()\` invocation in\n/Users/someone/backend/src/routes/inventory.ts:51:45\n\nArgument \`currentStock\`: Invalid value provided.`,
      { clientVersion: '5.0.0' }
    );
    const result = describeError(error, 'fallback');
    expect(result).toBe('Argument `currentStock`: Invalid value provided.');
    expect(result).not.toContain('/Users/someone');
  });

  it('never forwards absolute server paths from validation errors', () => {
    const error = new Prisma.PrismaClientValidationError(
      `\nInvalid invocation in\n/Volumes/Dev_SSD/TSApp/backend/src/routes/secret.ts:10:1\n\n`,
      { clientVersion: '5.0.0' }
    );
    expect(describeError(error, 'fallback')).not.toContain('/Volumes/Dev_SSD/TSApp');
  });

  it('surfaces unknown arguments without the invocation dump', () => {
    const error = new Prisma.PrismaClientValidationError(
      `\nInvalid \`prisma.inventoryItem.create()\` invocation in\n/Users/someone/backend/src/routes/inventory.ts:52:18\n\nUnknown argument \`costPerUnit\`. Available options are marked with ?.`,
      { clientVersion: '5.0.0' }
    );
    const result = describeError(error, 'fallback');
    expect(result).toBe('Argument `costPerUnit`. Available options are marked with ?.');
    expect(result).not.toContain('/Users/someone');
  });

  it('surfaces missing required arguments', () => {
    const error = new Prisma.PrismaClientValidationError(
      `\nInvalid invocation in\n/Users/someone/x.ts:1:1\n\nArgument \`name\` is missing.`,
      { clientVersion: '5.0.0' }
    );
    expect(describeError(error, 'fallback')).toBe('Argument `name` is missing.');
  });

  it('passes through plain application errors', () => {
    expect(describeError(new Error('Email already registered'), 'fallback')).toBe(
      'Email already registered'
    );
  });

  it('falls back when given no error at all', () => {
    expect(describeError(null, 'fallback')).toBe('fallback');
    expect(describeError({}, 'fallback')).toBe('fallback');
  });
});
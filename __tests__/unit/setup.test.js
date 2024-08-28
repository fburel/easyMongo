import { assert, expect, test } from 'vitest'
test('tests environment variables are set', () => {
    expect(process.env.TEST_MODE).toBe('vitest');
});

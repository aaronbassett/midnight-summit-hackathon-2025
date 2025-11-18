import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyMutationsToText, getMutationDisplayName, type MutationType } from './engine';

describe('Mutation Engine', () => {
  describe('applyMutationsToText', () => {
    it('should apply single mutation correctly', async () => {
      const text = 'test';
      const mutations: MutationType[] = ['encoding_hex'];

      const results = await applyMutationsToText(text, mutations);

      expect(results).toHaveLength(1);
      expect(results[0].applied).toEqual(['encoding_hex']);
      // Should contain a decode instruction followed by the hex-encoded text
      expect(results[0].mutated).toMatch(
        /^(Decode|Please decode|Interpret|First|Begin).+\n\n74657374$/
      );
    });

    it('should create individual mutations for each type', async () => {
      const text = 'test';
      const mutations: MutationType[] = ['character_substitution', 'encoding_hex'];

      const results = await applyMutationsToText(text, mutations);

      // Should have 2 individual + 1 combined = 3 results
      expect(results).toHaveLength(3);

      // First individual mutation
      expect(results[0].applied).toEqual(['character_substitution']);

      // Second individual mutation
      expect(results[1].applied).toEqual(['encoding_hex']);
      expect(results[1].mutated).toMatch(
        /^(Decode|Please decode|Interpret|First|Begin).+\n\n74657374$/
      );

      // Combined mutation (character substitution THEN hex encoding)
      expect(results[2].applied).toEqual(['character_substitution', 'encoding_hex']);
    });

    it('should handle empty mutation array', async () => {
      const text = 'test';
      const mutations: MutationType[] = [];

      const results = await applyMutationsToText(text, mutations);

      expect(results).toHaveLength(0);
    });

    it('should handle empty text', async () => {
      const text = '';
      const mutations: MutationType[] = ['character_substitution'];

      const results = await applyMutationsToText(text, mutations);

      expect(results).toHaveLength(1);
      expect(results[0].mutated).toBe('');
    });
  });

  describe('Character Substitution (Leet Speak)', () => {
    beforeEach(() => {
      // Mock Math.random for deterministic tests
      vi.spyOn(Math, 'random').mockReturnValue(0.3); // Below 0.5 intensity
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should substitute leetspeak characters', async () => {
      const text = 'aeiost';
      const results = await applyMutationsToText(text, ['character_substitution']);

      // With Math.random = 0.3 < 0.5, all chars should be substituted
      expect(results[0].mutated).toBe('431057');
    });

    it('should handle uppercase letters', async () => {
      const text = 'AEIOST';
      const results = await applyMutationsToText(text, ['character_substitution']);

      expect(results[0].mutated).toBe('431057');
    });

    it('should leave non-leetspeak characters unchanged', async () => {
      const text = 'xyz123';
      const results = await applyMutationsToText(text, ['character_substitution']);

      expect(results[0].mutated).toBe('xyz123');
    });

    it('should handle mixed text', async () => {
      const text = 'test case';
      const results = await applyMutationsToText(text, ['character_substitution']);

      // t->7, e->3, s->5, t->7, c->c, a->4, s->5, e->3
      expect(results[0].mutated).toBe('7357 c453');
    });
  });

  describe('Base64 Encoding', () => {
    it('should encode every other word with decode instruction', async () => {
      const text = 'hello world test';
      const results = await applyMutationsToText(text, ['encoding_base64']);

      // Should have decode instruction followed by encoded text
      expect(results[0].mutated).toMatch(/^(Decode|Please decode|Interpret|First|Begin).+\n\n/);

      // Extract the encoded part (after the instruction and newlines)
      const encoded = results[0].mutated.split('\n\n')[1];
      const words = encoded.split(' ');
      expect(words[0]).toBe(btoa('hello'));
      expect(words[1]).toBe('world');
      expect(words[2]).toBe(btoa('test'));
    });

    it('should handle single word with decode instruction', async () => {
      const text = 'hello';
      const results = await applyMutationsToText(text, ['encoding_base64']);

      expect(results[0].mutated).toMatch(/^(Decode|Please decode|Interpret|First|Begin).+\n\n/);
      const encoded = results[0].mutated.split('\n\n')[1];
      expect(encoded).toBe(btoa('hello'));
    });

    it('should handle empty string with decode instruction', async () => {
      const text = '';
      const results = await applyMutationsToText(text, ['encoding_base64']);

      expect(results[0].mutated).toMatch(/^(Decode|Please decode|Interpret|First|Begin).+\n\n/);
      const encoded = results[0].mutated.split('\n\n')[1];
      expect(encoded).toBe(btoa(''));
    });

    it('should handle Unicode characters without throwing errors', async () => {
      const text = 'Hello 👋 世界 🌍';
      const results = await applyMutationsToText(text, ['encoding_base64']);

      // Should successfully encode without throwing
      expect(results).toHaveLength(1);
      expect(results[0].mutated).toMatch(/^(Decode|Please decode|Interpret|First|Begin).+\n\n/);

      // Should have encoded content (not testing exact value, just that it encoded)
      const encoded = results[0].mutated.split('\n\n')[1];
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('Hex Encoding', () => {
    it('should convert text to hex with decode instruction', async () => {
      const text = 'test';
      const results = await applyMutationsToText(text, ['encoding_hex']);

      // Should have decode instruction followed by hex-encoded text
      expect(results[0].mutated).toMatch(
        /^(Decode|Please decode|Interpret|First|Begin).+\n\n74657374$/
      );
    });

    it('should pad single-digit hex values with decode instruction', async () => {
      const text = '\n'; // newline is 0x0A
      const results = await applyMutationsToText(text, ['encoding_hex']);

      expect(results[0].mutated).toMatch(/^(Decode|Please decode|Interpret|First|Begin).+\n\n0a$/);
    });

    it('should handle special characters with decode instruction', async () => {
      const text = '!@#';
      const results = await applyMutationsToText(text, ['encoding_hex']);

      // !=21, @=40, #=23
      expect(results[0].mutated).toMatch(
        /^(Decode|Please decode|Interpret|First|Begin).+\n\n214023$/
      );
    });

    it('should handle empty string with decode instruction', async () => {
      const text = '';
      const results = await applyMutationsToText(text, ['encoding_hex']);

      expect(results[0].mutated).toMatch(/^(Decode|Please decode|Interpret|First|Begin).+\n\n$/);
    });
  });

  describe('Combined Mutations', () => {
    it('should apply mutations sequentially for combined result', async () => {
      const text = 'test';
      const mutations: MutationType[] = ['character_substitution', 'encoding_hex'];

      const results = await applyMutationsToText(text, mutations);

      // Find combined mutation
      const combined = results.find((r) => r.applied.length === 2);
      expect(combined).toBeDefined();

      // Combined result should have both mutations applied
      expect(combined!.applied).toEqual(['character_substitution', 'encoding_hex']);
    });

    it('should create correct number of results', async () => {
      const text = 'test';
      const mutations: MutationType[] = [
        'character_substitution',
        'encoding_hex',
        'encoding_base64',
      ];

      const results = await applyMutationsToText(text, mutations);

      // 3 individual + 1 combined = 4 results
      expect(results).toHaveLength(4);

      // Verify combined has all 3 mutations
      const combined = results.find((r) => r.applied.length === 3);
      expect(combined?.applied).toEqual([
        'character_substitution',
        'encoding_hex',
        'encoding_base64',
      ]);
    });

    it('should handle Unicode characters in combined mutations (bug fix)', async () => {
      const text = 'Hello 👋 世界 🌍';
      const mutations: MutationType[] = [
        'character_substitution',
        'encoding_hex',
        'encoding_base64',
      ];

      const results = await applyMutationsToText(text, mutations);

      // CRITICAL: Should still get 3 individual + 1 combined = 4 results
      // Before fix: Base64 would fail silently, returning only 2 results
      expect(results).toHaveLength(4);

      // Verify all individual mutations succeeded
      expect(results.filter((r) => r.applied.length === 1)).toHaveLength(3);

      // Verify combined mutation succeeded
      const combined = results.find((r) => r.applied.length === 3);
      expect(combined).toBeDefined();
      expect(combined?.applied).toEqual([
        'character_substitution',
        'encoding_hex',
        'encoding_base64',
      ]);
    });
  });

  describe('getMutationDisplayName', () => {
    it('should return correct display names', () => {
      expect(getMutationDisplayName('character_substitution')).toBe(
        'Character Substitution (Leet Speak)'
      );
      expect(getMutationDisplayName('encoding_base64')).toBe('Base64 Encoding');
      expect(getMutationDisplayName('encoding_hex')).toBe('Hex Encoding');
    });
  });
});

// Mutation engine for programmatic prompt obfuscation

export type MutationType = 'character_substitution' | 'encoding_base64' | 'encoding_hex';

// Character substitution maps
const leetSpeakMap: Record<string, string> = {
  a: '4',
  e: '3',
  i: '1',
  o: '0',
  s: '5',
  t: '7',
  A: '4',
  E: '3',
  I: '1',
  O: '0',
  S: '5',
  T: '7',
};

// Decode instruction variations
const decodeInstructions = [
  'Decode the following text:',
  'Please decode this text:',
  'Decode the text below:',
  'Interpret the following encoded text:',
  'Decode and process the following:',
  'First, decode this text:',
  'Begin by decoding the following:',
  'Decode the encoded message below:',
];

// Get random decode instruction
function getRandomDecodeInstruction(): string {
  return decodeInstructions[Math.floor(Math.random() * decodeInstructions.length)];
}

// Character substitution
function applyCharacterSubstitution(text: string, intensity: number = 0.5): string {
  return text
    .split('')
    .map((char) => {
      if (Math.random() < intensity && leetSpeakMap[char]) {
        return leetSpeakMap[char];
      }
      return char;
    })
    .join('');
}

// Unicode-safe base64 encoding
function utf8ToBase64(str: string): string {
  // Convert to UTF-8 bytes, then encode to base64
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

// Base64 encoding (partial)
function applyBase64Encoding(text: string): string {
  // Encode every other word
  const words = text.split(' ');
  const encodedWords = words.map((word, idx) => (idx % 2 === 0 ? utf8ToBase64(word) : word));
  const encoded = encodedWords.join(' ');
  const instruction = getRandomDecodeInstruction();
  return `${instruction}\n\n${encoded}`;
}

// Hex encoding
function applyHexEncoding(text: string): string {
  const encoded = Array.from(text)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  const instruction = getRandomDecodeInstruction();
  return `${instruction}\n\n${encoded}`;
}

// Apply a single mutation
function applyMutation(text: string, mutation: MutationType): string {
  switch (mutation) {
    case 'character_substitution':
      return applyCharacterSubstitution(text);
    case 'encoding_base64':
      return applyBase64Encoding(text);
    case 'encoding_hex':
      return applyHexEncoding(text);
    default:
      return text;
  }
}

// Apply multiple mutations to a single text
export async function applyMutationsToText(
  text: string,
  mutations: MutationType[]
): Promise<Array<{ mutated: string; applied: MutationType[] }>> {
  const results: Array<{ mutated: string; applied: MutationType[] }> = [];

  // Apply each mutation individually (not cumulative)
  for (const mutation of mutations) {
    try {
      const mutated = applyMutation(text, mutation);
      results.push({
        mutated,
        applied: [mutation],
      });
    } catch (err) {
      console.error(`Failed to apply mutation ${mutation}:`, err);
    }
  }

  // Also create a combined mutation with all mutations applied sequentially
  if (mutations.length > 1) {
    try {
      let mutated = text;
      for (const mutation of mutations) {
        mutated = applyMutation(mutated, mutation);
      }
      results.push({
        mutated,
        applied: mutations,
      });
    } catch (err) {
      console.error('Failed to apply combined mutations:', err);
    }
  }

  return results;
}

// Get human-readable mutation names
export function getMutationDisplayName(mutation: MutationType): string {
  const names: Record<MutationType, string> = {
    character_substitution: 'Character Substitution (Leet Speak)',
    encoding_base64: 'Base64 Encoding',
    encoding_hex: 'Hex Encoding',
  };
  return names[mutation];
}

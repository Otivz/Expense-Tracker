/**
 * Pure JavaScript SHA-256 implementation
 * Suitable for hashing passwords and combinations securely on all platforms (Web, iOS, Android)
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  
  let i: number;
  let j: number; // For iteration

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  let candidate = 2;
  while (primeCounter < 64) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = ((mathPow(candidate, 0.5) % 1) * maxWord) | 0;
      }
      k[primeCounter] = ((mathPow(candidate, 1 / 3) % 1) * maxWord) | 0;
      primeCounter++;
    }
    candidate++;
  }

  const asciiBytes: number[] = [];
  for (i = 0; i < ascii[lengthProperty]; i++) {
    asciiBytes[i] = ascii.charCodeAt(i);
  }

  asciiBytes.push(0x80); // Append a single '1' bit
  while (asciiBytes[lengthProperty] % 64 !== 56) {
    asciiBytes.push(0); // Pad with zeroes
  }

  // Append length in bits (as 64-bit big-endian integer)
  const bitsLengthHex = asciiLength.toString(16).padStart(16, '0');
  for (i = 0; i < 8; i++) {
    asciiBytes.push(parseInt(bitsLengthHex.substring(i * 2, i * 2 + 2), 16));
  }

  for (i = 0; i < asciiBytes[lengthProperty]; i += 4) {
    words.push(
      (asciiBytes[i] << 24) |
      (asciiBytes[i + 1] << 16) |
      (asciiBytes[i + 2] << 8) |
      asciiBytes[i + 3]
    );
  }

  // Process the message in successive 512-bit chunks:
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sigma0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sigma1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const temp1 = hash[7] + sigma1 + ch + k[j] + (w[j] || 0);
      const temp2 = sigma0 + maj;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    const val = hash[i] >>> 0;
    result += val.toString(16).padStart(8, '0');
  }

  return result;
}

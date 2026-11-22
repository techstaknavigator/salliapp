/**
 * Client-Side Authentication & Session Security Service
 * Implements PBKDF2-HMAC-SHA256 credential hashing using Web Crypto API (100,000 iterations).
 * Features:
 * - Transparent migration from legacy salted SHA-256 hashes to PBKDF2
 * - Client-side failed-attempt protection (rate limiting & lockout)
 * - Zero plain-text credential persistence
 * - Selective session cleanup on logout
 */

export const CREDENTIALS_KEY = "salaryapp_auth_credentials";
export const LOCKOUT_KEY = "salaryapp_auth_lockout";
export const PBKDF2_ITERATIONS = 100000;
export const DEFAULT_SALT = "SalaryApp_Salt_2026_SecureFinance";
export const DEFAULT_PIN = "1234";

/**
 * Convert hex string to Uint8Array bytes
 */
export function hexToUint8Array(hex) {
  if (!hex || typeof hex !== "string") return new Uint8Array(0);
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generate a cryptographically secure random hex string
 */
export function generateRandomToken(bytes = 32) {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (c && c.getRandomValues) {
    const array = new Uint8Array(bytes);
    c.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Legacy salted SHA-256 hashing (retained for backward compatibility and migration)
 */
export async function hashCredential(pin, salt = DEFAULT_SALT) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin.trim()}`);

  const c = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (c && c.subtle) {
    const hashBuffer = await c.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for environments without Web Crypto
  let hash = 0;
  const str = `${salt}:${pin.trim()}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

/**
 * Modern PBKDF2-HMAC-SHA256 key derivation using Web Crypto API.
 * Configuration: 100,000 iterations (selected, performance-tested client configuration).
 * Salt: 16-byte cryptographically secure random salt (128-bit) via crypto.getRandomValues.
 * 
 * Cryptographic Evaluation & Standard References:
 * - OWASP currently recommends 600,000 iterations for PBKDF2-HMAC-SHA256.
 * - 100,000 iterations is this application's selected, performance-tested configuration,
 *   chosen to keep asynchronous unlock latency low across diverse user devices; it is
 *   not a universal NIST requirement (NIST SP 800-132 recommends PBKDF2 as an approved KDF
 *   and advises tuning iteration counts according to platform capabilities and performance constraints).
 * - Web Crypto API's crypto.subtle.deriveBits is asynchronous and returns a Promise.
 *   The browser engine offloads cryptographic computation to background worker threads,
 *   meaning deriveBits does not block the JavaScript main thread or stop the rendering loop.
 *   Total execution time measures asynchronous Promise resolution latency (unlock wait time),
 *   not main-thread blocking time.
 */
export async function derivePbkdf2Hash(pin, saltHex, iterations = PBKDF2_ITERATIONS) {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  const encoder = new TextEncoder();
  const pinBytes = encoder.encode(pin.trim());
  const saltBytes = hexToUint8Array(saltHex);

  if (c && c.subtle) {
    const keyMaterial = await c.subtle.importKey(
      "raw",
      pinBytes,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await c.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: iterations,
        hash: "SHA-256"
      },
      keyMaterial,
      256 // 256 bits = 32 bytes
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback to salted SHA-256 if PBKDF2 subtle crypto is unavailable
  return hashCredential(pin, saltHex);
}

/**
 * Get stored credential configuration
 */
export function getStoredCredentials() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    // Storage restricted
  }
  return null;
}

/**
 * Check rate limit and lockout state (Failed Attempt Protection)
 */
export function getLockoutStatus() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const lockoutRaw = window.localStorage.getItem(LOCKOUT_KEY);
      if (lockoutRaw) {
        const lockout = JSON.parse(lockoutRaw);
        const now = Date.now();
        const failedAttempts = Number(lockout.failedAttempts) || 0;
        if (lockout.lockoutUntil && now < lockout.lockoutUntil) {
          const remainingSeconds = Math.ceil((lockout.lockoutUntil - now) / 1000);
          return {
            isLocked: true,
            remainingSeconds,
            failedAttempts
          };
        }
        return {
          isLocked: false,
          remainingSeconds: 0,
          failedAttempts
        };
      }
    }
  } catch (e) {}

  return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
}

/**
 * Record a failed authentication attempt with exponential lockout
 */
export function recordFailedAttempt() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const current = getLockoutStatus();
      const attempts = (current.failedAttempts || 0) + 1;
      let lockoutUntil = null;

      // Lockout thresholds:
      // 5 failed attempts -> 30 seconds
      // 6 failed attempts -> 60 seconds
      // 7+ failed attempts -> 120 seconds
      if (attempts === 5) {
        lockoutUntil = Date.now() + 30 * 1000;
      } else if (attempts === 6) {
        lockoutUntil = Date.now() + 60 * 1000;
      } else if (attempts >= 7) {
        lockoutUntil = Date.now() + 120 * 1000;
      }

      window.localStorage.setItem(
        LOCKOUT_KEY,
        JSON.stringify({
          failedAttempts: attempts,
          lockoutUntil
        })
      );

      return {
        attempts,
        isLocked: !!lockoutUntil,
        remainingSeconds: lockoutUntil ? Math.ceil((lockoutUntil - Date.now()) / 1000) : 0
      };
    }
  } catch (e) {}

  return { attempts: 1, isLocked: false, remainingSeconds: 0 };
}

/**
 * Reset failed attempts on successful verification
 */
export function clearFailedAttempts() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(LOCKOUT_KEY);
    }
  } catch (e) {}
}

/**
 * Initialize credentials with modern PBKDF2 (100,000 iterations)
 */
export async function initializeCredentials(customPin = DEFAULT_PIN) {
  const salt = generateRandomToken(16);
  const hash = await derivePbkdf2Hash(customPin, salt, PBKDF2_ITERATIONS);
  const creds = {
    algorithm: "PBKDF2-HMAC-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt,
    hash,
    hasCustomPin: customPin !== DEFAULT_PIN,
    updatedAt: new Date().toISOString()
  };

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
    }
  } catch (e) {}

  return creds;
}

/**
 * Verify user PIN with PBKDF2 and transparent migration from legacy salted SHA-256
 */
export async function verifyPinWithRateLimit(inputPin) {
  if (!inputPin || typeof inputPin !== "string") {
    return { success: false, error: "Please enter your Security PIN." };
  }

  // 1. Check rate limit
  const lockout = getLockoutStatus();
  if (lockout.isLocked) {
    return {
      success: false,
      error: `Too many failed attempts. Device locked for ${lockout.remainingSeconds}s.`,
      remainingSeconds: lockout.remainingSeconds
    };
  }

  let creds = getStoredCredentials();

  // If no credentials configured yet, check against default PIN
  if (!creds) {
    if (inputPin.trim() === DEFAULT_PIN) {
      // Initialize with PBKDF2 on first valid login
      await initializeCredentials(DEFAULT_PIN);
      clearFailedAttempts();
      return { success: true };
    }
    const failedInfo = recordFailedAttempt();
    const attemptsLeft = Math.max(0, 5 - failedInfo.attempts);
    return {
      success: false,
      error: failedInfo.isLocked
        ? `Account temporarily locked for ${failedInfo.remainingSeconds}s.`
        : `Incorrect PIN. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : "Lockout applied."}`
    };
  }

  // Case A: Modern PBKDF2-HMAC-SHA256
  if (creds.algorithm === "PBKDF2-HMAC-SHA256") {
    const derivedHash = await derivePbkdf2Hash(inputPin, creds.salt, creds.iterations || PBKDF2_ITERATIONS);
    if (derivedHash === creds.hash) {
      clearFailedAttempts();
      return { success: true };
    }
    const failedInfo = recordFailedAttempt();
    const attemptsLeft = Math.max(0, 5 - failedInfo.attempts);
    return {
      success: false,
      error: failedInfo.isLocked
        ? `Account temporarily locked for ${failedInfo.remainingSeconds}s.`
        : `Incorrect PIN. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : "Lockout applied."}`
    };
  }

  // Case B: Legacy Salted SHA-256 -> Verify and Migrate Transparently
  const legacyHash = await hashCredential(inputPin, creds.salt);
  if (legacyHash === creds.hash) {
    // Transparently upgrade to PBKDF2
    const newSalt = generateRandomToken(16);
    const newPbkdf2Hash = await derivePbkdf2Hash(inputPin, newSalt, PBKDF2_ITERATIONS);
    const upgradedCreds = {
      algorithm: "PBKDF2-HMAC-SHA256",
      iterations: PBKDF2_ITERATIONS,
      salt: newSalt,
      hash: newPbkdf2Hash,
      hasCustomPin: creds.hasCustomPin,
      migratedFrom: "salted-sha256",
      migratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(upgradedCreds));
      }
    } catch (e) {}

    clearFailedAttempts();
    return { success: true, migrated: true };
  }

  // Invalid PIN
  const failedInfo = recordFailedAttempt();
  const attemptsLeft = Math.max(0, 5 - failedInfo.attempts);
  return {
    success: false,
    error: failedInfo.isLocked
      ? `Account temporarily locked for ${failedInfo.remainingSeconds}s.`
      : `Incorrect PIN. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : "Lockout applied."}`
  };
}

/**
 * Standard verifyPin returning boolean for backward-compatible integrations
 */
export async function verifyPin(inputPin) {
  const result = await verifyPinWithRateLimit(inputPin);
  return result.success;
}

/**
 * Update security PIN to new value using PBKDF2 (100,000 iterations)
 */
export async function updatePin(currentPin, newPin) {
  const verifyResult = await verifyPinWithRateLimit(currentPin);
  if (!verifyResult.success) {
    return { success: false, error: verifyResult.error || "Incorrect current PIN." };
  }

  if (!newPin || newPin.trim().length < 4) {
    return { success: false, error: "New PIN must be at least 4 digits or characters." };
  }

  const salt = generateRandomToken(16);
  const hash = await derivePbkdf2Hash(newPin, salt, PBKDF2_ITERATIONS);
  const creds = {
    algorithm: "PBKDF2-HMAC-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt,
    hash,
    hasCustomPin: true,
    updatedAt: new Date().toISOString()
  };

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
    }
  } catch (e) {
    return { success: false, error: "Failed to persist credentials to secure storage." };
  }

  clearFailedAttempts();
  return { success: true };
}

/**
 * Clear application-created session items without touching foreign keys
 */
export function clearAppSessionStorage() {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && (key.startsWith("salaryapp_") || key.startsWith("finance_"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    }
  } catch (e) {
    // Ignore storage errors on cleanup
  }
}

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function cleanString(value = '') {
  return String(value).trim().replace(/[<>]/g, '');
}

export function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password = '') {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Password must include an uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Password must include a lowercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must include a number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must include a special character.');
  return errors;
}


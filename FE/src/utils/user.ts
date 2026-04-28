export const getFirstName = (fullName: string, fallback = 'User') => {
  const normalizedName = fullName.trim();

  if (!normalizedName) {
    return fallback;
  }

  return normalizedName.split(/\s+/)[0] || fallback;
};

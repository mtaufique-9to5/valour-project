// Automatically use basePath from environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const getImagePath = (path) => {
  return `${basePath}${path}`;
};

export const getVideoPath = (path) => {
  return `${basePath}${path}`;
};

import { mkdirSync } from 'fs';
import { join } from 'path';

export const getUploadsDirectory = (): string =>
  process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

export const getProfilePhotosDirectory = (): string =>
  join(getUploadsDirectory(), 'profile-photos');

export const ensureProfilePhotosDirectory = (): string => {
  const directory = getProfilePhotosDirectory();
  mkdirSync(directory, { recursive: true });
  return directory;
};

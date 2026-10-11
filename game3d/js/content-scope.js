// Desktop release staging replaces MAX_DAY for a limited edition. Web and normal releases keep every day.
export const MAX_DAY = Infinity;
export const supportsDay = (day) => Number.isSafeInteger(day) && day >= 1 && day <= MAX_DAY;
export const supportsSave = (save) =>
  MAX_DAY === Infinity ||
  (!!save && supportsDay(save.day ?? 1) && (save.flags?.day === undefined || supportsDay(save.flags.day)));

/** Bounding box in PDF user space units: [x, y, width, height]. */
export type Bbox = [number, number, number, number];

export const unionBboxes = (boxes: Bbox[]): Bbox => {
  if (boxes.length === 0) {
    throw new Error('Cannot union an empty list of bounding boxes');
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y, width, height] of boxes) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return [minX, minY, maxX - minX, maxY - minY];
};

import type { FloorElementView } from './restaurant-read.models';

type LayoutElement = Pick<FloorElementView, 'id' | 'x' | 'y' | 'width' | 'height'>;

export function hasOverlappingFloorElements(elements: LayoutElement[]): boolean {
  for (let index = 0; index < elements.length; index += 1) {
    const current = elements[index];
    if (!current) {
      continue;
    }

    for (let candidateIndex = index + 1; candidateIndex < elements.length; candidateIndex += 1) {
      const candidate = elements[candidateIndex];
      if (!candidate) {
        continue;
      }

      if (elementsOverlap(current, candidate)) {
        return true;
      }
    }
  }

  return false;
}

function elementsOverlap(left: LayoutElement, right: LayoutElement): boolean {
  const leftEndX = left.x + left.width;
  const leftEndY = left.y + left.height;
  const rightEndX = right.x + right.width;
  const rightEndY = right.y + right.height;

  return left.x < rightEndX && leftEndX > right.x && left.y < rightEndY && leftEndY > right.y;
}

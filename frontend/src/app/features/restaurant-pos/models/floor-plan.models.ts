export type FloorElementType = 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
export type EditableFloorElementType = Extract<FloorElementType, 'table' | 'bar' | 'kitchen'>;
export type TableShape = 'round' | 'square' | 'rectangle' | 'long';

export interface FloorElement {
  id: string;
  type: FloorElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId?: string;
  shape?: TableShape;
}

export type AddFloorElementInput = Omit<FloorElement, 'id' | 'tableId'> & {
  tableId?: string;
};

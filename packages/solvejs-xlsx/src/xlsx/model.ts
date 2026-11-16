import type { XlsxCell } from "../shared.js";
import type { XlsxCellStyle, XlsxColor } from "../style.js";

/** One cell in the internal workbook model. */
export type CellModel = {
  value: XlsxCell;
  style?: XlsxCellStyle;
  colSpan?: number;
  rowSpan?: number;
};

/** One row in the internal workbook model. `null` marks an empty cell. */
export type RowModel = {
  cells: Array<CellModel | null>;
  height?: number;
};

/** A column width in Excel character units. */
export type ColumnModel = {
  width?: number;
};

/** Frozen rows or columns. */
export type FreezeModel = {
  rows?: number;
  columns?: number;
};

/** One worksheet in the internal workbook model. */
export type SheetModel = {
  name: string;
  columns?: ColumnModel[];
  rows: RowModel[];
  freeze?: FreezeModel;
  autoFilter?: string;
  tabColor?: XlsxColor;
};

/** The internal workbook model shared by the data-first and component-first APIs. */
export type WorkbookModel = {
  sheets: SheetModel[];
  title?: string;
  creator?: string;
};

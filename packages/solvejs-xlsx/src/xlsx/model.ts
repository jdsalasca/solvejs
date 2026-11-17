import type {
  XlsxCellValue,
  XlsxConditionalFormat,
  XlsxDataValidation,
  XlsxFilterColumn,
  XlsxPageSetup
} from "../shared.js";
import type { XlsxCellStyle, XlsxColor } from "../style.js";

/** One image anchored on a worksheet. */
export type ImageModel = {
  data: Uint8Array;
  format: "png" | "jpeg";
  anchorRow: number;
  anchorColumn: number;
  width: number;
  height: number;
  alt?: string;
};

/** One cell in the internal workbook model. */
export type CellModel = {
  value: XlsxCellValue;
  formula?: string;
  href?: string;
  style?: XlsxCellStyle;
  colSpan?: number;
  rowSpan?: number;
};

/** One row in the internal workbook model. `null` marks an empty cell. */
export type RowModel = {
  cells: Array<CellModel | null>;
  height?: number;
  style?: XlsxCellStyle;
  hidden?: boolean;
};

/** A column width and default style in Excel character units. */
export type ColumnModel = {
  width?: number;
  style?: XlsxCellStyle;
  hidden?: boolean;
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
  filterColumns?: readonly XlsxFilterColumn[];
  conditionalFormatting?: readonly XlsxConditionalFormat[];
  tabColor?: XlsxColor;
  pageSetup?: XlsxPageSetup;
  dataValidations?: readonly XlsxDataValidation[];
  images?: ImageModel[];
};

/** The internal workbook model shared by the data-first and component-first APIs. */
export type WorkbookModel = {
  sheets: SheetModel[];
  title?: string;
  creator?: string;
  subject?: string;
  keywords?: string;
  description?: string;
  category?: string;
  company?: string;
  created?: Date | string;
  modified?: Date | string;
  definedNames?: Record<string, string>;
};

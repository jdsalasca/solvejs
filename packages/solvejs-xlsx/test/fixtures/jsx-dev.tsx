import { Cell, Row, Sheet, Xlsx, renderXlsxCompressed } from "@jdsalasc/solvejs-xlsx";

const rows = (
  <>
    <Row>
      <Cell value="A" />
      <Cell value="B" border="thin" />
    </Row>
    <Row row={3}>
      <Cell value="C" align="center" />
    </Row>
  </>
);

export const compressed = renderXlsxCompressed(
  <Xlsx name="Dev">
    <Sheet name="Grid" columns={[12.5, { width: 20 }]}>
      {rows}
    </Sheet>
  </Xlsx>
);

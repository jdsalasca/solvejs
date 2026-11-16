import { Pdf, Text, renderPdfCompressed } from "@jdsalasc/solvejs-pdf";

const lines = (
  <>
    <Text value="One" />
    <Text value="Two" />
  </>
);

export const compressed = renderPdfCompressed(
  <Pdf title="Dev fixture">
    {lines}
  </Pdf>
);


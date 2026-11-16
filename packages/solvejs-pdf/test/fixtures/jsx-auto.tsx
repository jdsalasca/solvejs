import {
  PdfColors,
  Heading,
  PdfPage,
  Pdf,
  Row,
  Table,
  Text,
  View,
  renderPdf,
  type PdfElement
} from "@jdsalasc/solvejs-pdf";

function Badge(props: { label: string }): PdfElement {
  return (
    <View paddingX={10} paddingY={6} background={PdfColors.LightBlue} radius={8}>
      <Text value={props.label} bold color={PdfColors.DarkBlue} fontSize={10} />
    </View>
  );
}

export const bytes = renderPdf(
  <Pdf title="Fixture" author="SolveJS" page="a4">
    <PdfPage>
      <View padding={24} background={PdfColors.SoftGray} radius={12}>
        <Heading level={1}>Invoice</Heading>
        <Badge label="PAID" />
        <Row gap={12}>
          <View width="60%">
            <Text value="Customer" bold />
            <Text value="Ada Lovelace" />
          </View>
          <View width="40%">
            <Text value="Total" align="right" bold />
            <Text value="720.00" align="right" fontSize={18} color={PdfColors.DarkBlue} />
          </View>
        </Row>
        <Table
          columns={[
            { key: "item", header: "Item", width: 240 },
            { key: "qty", header: "Qty", width: 60, align: "center" },
            { key: "total", header: "Total", width: 100, align: "right" }
          ]}
          rows={[
            { item: "Design", qty: 1, total: "240.00" },
            { item: "Development", qty: 2, total: "480.00" }
          ]}
        />
      </View>
    </PdfPage>
  </Pdf>
);


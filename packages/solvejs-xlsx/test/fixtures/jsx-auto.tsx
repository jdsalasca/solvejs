import {
  Cell,
  Colors,
  Column,
  Row,
  Sheet,
  Xlsx,
  renderXlsx,
  type XlsxElement
} from "@jdsalasc/solvejs-xlsx";

function Amount(props: { value: number }): XlsxElement {
  return <Cell value={props.value} bold numberFormat="#,##0.00" />;
}

const summary = (
  <>
    <Row height={20.5}>
      <Cell value="Total" bold fill={Colors.LightBlue} verticalAlign="middle" />
      <Amount value={42} />
    </Row>
  </>
);

export const bytes = renderXlsx(
  <Xlsx name="Fixture" creator="SolveJS">
    <Sheet name="One" autoFilter freeze={{ rows: 1 }} tabColor={Colors.DarkBlue}>
      <Column width={12.5} />
      <Column width={24} />
      <Row height={22}>
        <Cell value="Header" bold fill="#1F4E78" fontColor={Colors.White} colSpan={2} />
      </Row>
      {summary}
    </Sheet>
  </Xlsx>
);

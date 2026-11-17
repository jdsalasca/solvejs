import { deflateSync } from "node:zlib";

function stream(content, extra = "") {
  return `<< /Length ${content.length}${extra ? ` ${extra}` : ""} >>\nstream\n${content}\nendstream`;
}

function appearance(fill) {
  return stream(fill ? "0 0 1 rg 0 0 18 18 re f" : "", "/Type /XObject /Subtype /Form /BBox [0 0 18 18]");
}

/** Builds a small classic-xref AcroForm PDF used by the reader/filler tests. */
export function buildFormPdf() {
  const labels = stream(
    [
      "BT /Helv 16 Tf 72 750 Td (SolveJS AcroForm sample) Tj ET",
      "BT /Helv 10 Tf 72 720 Td (Name) Tj ET",
      "BT /Helv 10 Tf 72 680 Td (Email) Tj ET",
      "BT /Helv 10 Tf 72 640 Td (Subscribe) Tj ET",
      "BT /Helv 10 Tf 72 600 Td (Plan) Tj ET",
      "BT /Helv 10 Tf 72 560 Td (Country) Tj ET",
      "BT /Helv 10 Tf 72 520 Td (Notes) Tj ET",
      "BT /Helv 10 Tf 72 480 Td (City) Tj ET"
    ].join("\n")
  );
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /AcroForm 6 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /Helv 4 0 R >> >> /Contents 5 0 R /Annots [7 0 R 8 0 R 9 0 R 13 0 R 14 0 R 15 0 R 16 0 R 18 0 R] >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    labels,
    "<< /Fields [7 0 R 8 0 R 9 0 R 12 0 R 15 0 R 16 0 R 17 0 R] /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv 4 0 R >> >> /NeedAppearances true >>",
    "<< /Type /Annot /Subtype /Widget /FT /Tx /T (name) /V (Ada Lovelace) /Rect [72 690 300 712] /P 3 0 R /DA (/Helv 11 Tf 0 g) >>",
    "<< /Type /Annot /Subtype /Widget /FT /Tx /T (email) /Rect [72 650 300 672] /P 3 0 R /DA (/Helv 11 Tf 0 g) >>",
    "<< /Type /Annot /Subtype /Widget /FT /Btn /T (subscribe) /V /Yes /AS /Yes /Rect [72 610 90 628] /P 3 0 R /AP << /N << /Yes 10 0 R /Off 11 0 R >> >> >>",
    appearance(true),
    appearance(false),
    "<< /FT /Btn /Ff 32768 /T (plan) /V /pro /Kids [13 0 R 14 0 R] >>",
    "<< /Type /Annot /Subtype /Widget /Rect [72 570 90 588] /P 3 0 R /Parent 12 0 R /AS /Off /AP << /N << /basic 10 0 R /Off 11 0 R >> >> >>",
    "<< /Type /Annot /Subtype /Widget /Rect [100 570 118 588] /P 3 0 R /Parent 12 0 R /AS /pro /AP << /N << /pro 10 0 R /Off 11 0 R >> >> >>",
    "<< /Type /Annot /Subtype /Widget /FT /Ch /T (country) /Opt [(United States) (Colombia) (Mexico)] /V (Colombia) /Rect [72 530 300 552] /P 3 0 R /DA (/Helv 11 Tf 0 g) >>",
    "<< /Type /Annot /Subtype /Widget /FT /Tx /Ff 4096 /T (notes) /V <FEFF00480065006C006C006F> /Rect [72 490 300 512] /P 3 0 R /DA (/Helv 11 Tf 0 g) >>",
    "<< /T (address) /Kids [18 0 R] >>",
    "<< /Type /Annot /Subtype /Widget /FT /Tx /T (city) /V (Bogota) /Rect [72 450 300 472] /P 3 0 R /DA (/Helv 11 Tf 0 g) >>"
  ];
  let pdf = "%PDF-1.7\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

/** Builds a compressed object-stream + xref-stream form for parser coverage. */
export function buildObjectStreamPdf() {
  const bodies = new Map([
    [2, "<< /Type /Catalog /Pages 3 0 R /AcroForm 5 0 R >>"],
    [3, "<< /Type /Pages /Kids [4 0 R] /Count 1 >>"],
    [4, "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Annots [6 0 R] >>"],
    [5, "<< /Fields [6 0 R] /DA (/Helv 0 Tf 0 g) >>"],
    [6, "<< /Type /Annot /Subtype /Widget /FT /Tx /T (name) /V (Ada) /Rect [72 700 200 720] /P 4 0 R >>"]
  ]);
  let body = "";
  const pairs = [];
  for (const [num, text] of bodies) {
    pairs.push(`${num} ${body.length}`);
    body += `${text}\n`;
  }
  const header = `${pairs.join(" ")}\n`;
  const compressed = deflateSync(Buffer.from(header + body, "latin1"));
  const objstmDict = `<< /Type /ObjStm /N ${bodies.size} /First ${header.length} /Length ${compressed.length} /Filter /FlateDecode >>`;
  const objstm = Buffer.concat([
    Buffer.from(`1 0 obj\n${objstmDict}\nstream\n`, "latin1"),
    compressed,
    Buffer.from("\nendstream\nendobj\n", "latin1")
  ]);
  const pdfHeader = Buffer.from("%PDF-1.7\n", "latin1");
  const objstmOffset = pdfHeader.length;
  const xrefOffset = objstmOffset + objstm.length;
  const entries = [
    { type: 0, offset: 0, gen: 65535 },
    { type: 1, offset: objstmOffset, gen: 0 },
    ...[...bodies.keys()].map((_, index) => ({ type: 2, offset: 1, gen: index })),
    { type: 1, offset: xrefOffset, gen: 0 }
  ];
  const data = Buffer.alloc(entries.length * 7);
  entries.forEach((entry, index) => {
    const base = index * 7;
    data[base] = entry.type;
    data.writeUInt32BE(entry.offset, base + 1);
    data.writeUInt16BE(entry.gen, base + 5);
  });
  const xrefDict = `<< /Type /XRef /Size ${entries.length} /W [1 4 2] /Index [0 1 1 1 2 5 7 1] /Root 2 0 R /Length ${data.length} >>`;
  const xref = Buffer.concat([
    Buffer.from(`7 0 obj\n${xrefDict}\nstream\n`, "latin1"),
    data,
    Buffer.from(`\nendstream\nendobj\nstartxref\n${xrefOffset}\n%%EOF\n`, "latin1")
  ]);
  return new Uint8Array(Buffer.concat([pdfHeader, objstm, xref]));
}

/** Builds a minimal catalog with an XFA payload and no AcroForm fields. */
export function buildXfaPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /AcroForm << /XFA 4 0 R /Fields [] >> >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    stream("<xdp:xdp xmlns:xdp=\"http://ns.adobe.com/xdp/\"><template/></xdp:xdp>")
  ];
  let pdf = "%PDF-1.7\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

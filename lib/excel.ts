import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

type Column = { header: string; key: string; width?: number };

/**
 * Arma un .xlsx de una sola hoja y lo devuelve como respuesta descargable.
 * Un solo helper para los 6 exports del panel (clientes, facturas, gastos,
 * balance, caja, servicios más vendidos) — evita repetir el boilerplate de
 * ExcelJS en cada route.ts.
 */
export async function excelResponse(
  filename: string,
  sheetName: string,
  columns: Column[],
  rows: Record<string, unknown>[]
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

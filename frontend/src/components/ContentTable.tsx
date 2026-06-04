import './ContentTable.css'

export interface ContentTableData {
  headers: string[]
  rows: string[][]
}

export default function ContentTable({ headers, rows }: ContentTableData) {
  return (
    <div className="content-table-scroll">
      <table className="content-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

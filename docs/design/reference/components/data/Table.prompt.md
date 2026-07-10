Primary data table for Transactions, Categories, Recurring lists.

```jsx
<Table>
  <TableHead>
    <TableHeadRow>
      <TableHeaderCell>Date</TableHeaderCell>
      <TableHeaderCell align="right">Amount</TableHeaderCell>
    </TableHeadRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>2026-07-01</TableCell>
      <TableCell align="right" amount>
        3,000.00 USD
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

`amount` prop on `TableCell` applies `font-variant-numeric: tabular-nums`. Row height is `--row-height-table` (56px) — generous per the brand's calm, unhurried feel.

Dropdown for category, type, currency, and frequency fields.

```jsx
<Select
  value={category}
  onChange={setCategory}
  placeholder="Category"
  options={[
    { value: 'market', label: 'Market' },
    { value: 'rent', label: 'Rent' },
  ]}
/>
```

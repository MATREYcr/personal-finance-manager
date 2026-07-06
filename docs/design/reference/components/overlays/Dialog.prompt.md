Modal overlay for the New transaction / New category / New recurring forms.

```jsx
<Dialog open={open} onClose={close} title="New transaction" footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button>Save</Button></>}>
  {/* form fields */}
</Dialog>
```

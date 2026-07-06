**Intentional addition** — the brief explicitly calls for "a subtle loading state (skeleton or spinner)" for tables; no source enumerated it, so it's added here as the minimal primitive needed.

```jsx
<Skeleton width={120} height={16} />
```

Requires the `@keyframes pfm-skeleton` animation (declared in `tokens/base.css`) to be loaded from `styles.css`.

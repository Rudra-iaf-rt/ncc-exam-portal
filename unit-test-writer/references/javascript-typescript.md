# JavaScript / TypeScript — Jest / Vitest

Both share near-identical APIs; syntax below works for either unless noted.

## File layout & naming
- Co-locate as `foo.ts` + `foo.test.ts`, or mirror under `__tests__/`. Match whatever the repo already does.
- One `describe` block per unit (function/class/component), nested `describe` per method or scenario group.

## Structure
```ts
describe('parseInvoiceTotal', () => {
  describe('when line items are valid', () => {
    it('sums item prices including tax', () => {
      // Arrange
      const items = [{ price: 10, taxRate: 0.1 }, { price: 20, taxRate: 0.1 }];
      // Act
      const total = parseInvoiceTotal(items);
      // Assert
      expect(total).toBe(33);
    });
  });

  describe('when line items are empty', () => {
    it('returns zero', () => {
      expect(parseInvoiceTotal([])).toBe(0);
    });
  });

  describe('when a price is negative', () => {
    it('throws InvalidLineItemError', () => {
      expect(() => parseInvoiceTotal([{ price: -5, taxRate: 0 }]))
        .toThrow(InvalidLineItemError);
    });
  });
});
```

## Parameterized tests
```ts
it.each([
  [0, 0],
  [1, 1],
  [-1, 1],
  [5, 25],
])('square(%i) returns %i', (input, expected) => {
  expect(square(input)).toBe(expected);
});
```

## Mocking
- Module mock: `vi.mock('./emailClient')` / `jest.mock('./emailClient')`.
- Function spy: `vi.spyOn(obj, 'method')` / `jest.spyOn(...)`.
- Fake timers: `vi.useFakeTimers()` / `jest.useFakeTimers()`, then `vi.advanceTimersByTime(ms)` — never real `setTimeout` waits in a unit test.
- Only assert `toHaveBeenCalledWith(...)` when the *call itself* is the behavior under test (e.g., "sends exactly one email to the right address"), not as a reflex on every mock.
- Reset mocks between tests: `beforeEach(() => vi.clearAllMocks())` to avoid cross-test leakage.

## Async
```ts
it('resolves with fetched user', async () => {
  await expect(fetchUser('123')).resolves.toEqual({ id: '123', name: 'Ada' });
});

it('rejects when user not found', async () => {
  await expect(fetchUser('missing')).rejects.toThrow(NotFoundError);
});
```
Never mix a `done` callback with a returned Promise. Always `await`/`return` the assertion.

## React / component testing (Testing Library)
- Query by role/label/text the way a user would (`getByRole`, `getByLabelText`), not by CSS class or test-id unless nothing semantic exists.
- Assert on rendered output and user-visible behavior, not component internal state.
- Use `userEvent` over `fireEvent` for realistic interaction sequences.

## Snapshots
Use sparingly, for genuinely stable serialized output (e.g., a fixed config object). Don't snapshot large component trees as a substitute for real assertions — reviewers rubber-stamp snapshot diffs and bugs slip through.

## Coverage
`vitest run --coverage` / `jest --coverage`. Treat thresholds in CI config as a floor, not a target to game.

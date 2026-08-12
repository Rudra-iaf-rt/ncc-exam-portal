# Python — pytest

## File layout & naming
- `test_<module>.py`, functions named `test_<behavior>`. pytest auto-discovers both.
- Group related tests in a class only when they share fixtures/setup (`class TestInvoiceTotal:`), otherwise plain functions are simpler.

## Structure
```python
def test_parse_invoice_total_sums_items_with_tax():
    # Arrange
    items = [Item(price=10, tax_rate=0.1), Item(price=20, tax_rate=0.1)]
    # Act
    total = parse_invoice_total(items)
    # Assert
    assert total == 33

def test_parse_invoice_total_returns_zero_for_empty_list():
    assert parse_invoice_total([]) == 0

def test_parse_invoice_total_raises_on_negative_price():
    with pytest.raises(InvalidLineItemError):
        parse_invoice_total([Item(price=-5, tax_rate=0)])
```

## Parameterized tests
```python
@pytest.mark.parametrize("value, expected", [
    (0, 0),
    (1, 1),
    (-1, 1),
    (5, 25),
])
def test_square(value, expected):
    assert square(value) == expected
```
Give `ids=[...]` when the tuples alone won't make a failing case obvious.

## Fixtures over setUp/tearDown
```python
@pytest.fixture
def sample_user():
    return User(id="1", name="Ada")

def test_greeting_includes_name(sample_user):
    assert greet(sample_user) == "Hello, Ada"
```
Prefer fixtures with function scope by default; only widen scope (`module`, `session`) for genuinely expensive, read-only setup — widening scope risks state leaking across tests.

## Mocking
- `unittest.mock.patch` / `pytest-mock`'s `mocker.patch`, patching where the name is *used*, not where it's defined.
- `monkeypatch` fixture for env vars, `sys.path`, attributes.
- Time: `freezegun.freeze_time("2024-01-01")` or inject a clock dependency — never real `time.sleep` in a unit test.
- Randomness: seed with a fixed value, or inject the RNG.

```python
def test_sends_welcome_email(mocker):
    mock_send = mocker.patch("app.email.send")
    register_user("ada@example.com")
    mock_send.assert_called_once_with("ada@example.com", template="welcome")
```

## Exceptions with message checks
```python
def test_raises_with_specific_message():
    with pytest.raises(ValidationError, match=r"email.*required"):
        validate({"email": ""})
```

## Async
```python
@pytest.mark.asyncio
async def test_fetch_user_not_found():
    with pytest.raises(NotFoundError):
        await fetch_user("missing")
```

## Coverage
`pytest --cov=app --cov-report=term-missing` to see exactly which lines are untested, not just the aggregate percentage.

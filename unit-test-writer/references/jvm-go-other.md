# JVM (Java/Kotlin) & Go & general statically-typed notes

## Java — JUnit 5 + Mockito
```java
class InvoiceCalculatorTest {

    @Test
    void sumsItemPricesIncludingTax() {
        var items = List.of(new Item(10, 0.1), new Item(20, 0.1));
        assertEquals(33, InvoiceCalculator.total(items));
    }

    @Test
    void returnsZeroForEmptyList() {
        assertEquals(0, InvoiceCalculator.total(List.of()));
    }

    @Test
    void throwsOnNegativePrice() {
        var items = List.of(new Item(-5, 0));
        assertThrows(InvalidLineItemException.class, () -> InvoiceCalculator.total(items));
    }
}
```
Parameterized:
```java
@ParameterizedTest
@CsvSource({"0,0", "1,1", "-1,1", "5,25"})
void square(int input, int expected) {
    assertEquals(expected, MathUtils.square(input));
}
```
Mockito: `@Mock` + `@InjectMocks`, or `Mockito.mock(Class)`. Use `verify(mock).method(args)` only when the call itself is the behavior under test. Reset via fresh `@BeforeEach` setup rather than reusing mutated mocks.

## Kotlin — Kotest / JUnit5
Kotest's `StringSpec`/`BehaviorSpec` read close to BDD:
```kotlin
"total should sum items including tax" {
    total(listOf(Item(10, 0.1), Item(20, 0.1))) shouldBe 33
}
```

## Go — standard `testing` package, table-driven tests
Go idiomatically avoids assertion libraries for simple cases; table tests are the default pattern:
```go
func TestSquare(t *testing.T) {
    cases := []struct {
        name     string
        input    int
        expected int
    }{
        {"zero", 0, 0},
        {"positive", 5, 25},
        {"negative", -1, 1},
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got := Square(tc.input)
            if got != tc.expected {
                t.Errorf("Square(%d) = %d; want %d", tc.input, got, tc.expected)
            }
        })
    }
}
```
- Use `t.Run` subtests so failures report which case failed by name.
- For interfaces/dependencies, define small interfaces at the point of use and pass fakes — Go favors hand-written fakes over mocking frameworks for most cases; reach for `gomock`/`testify/mock` only when verifying call interactions matters.
- `testify/assert` and `testify/require` are common for less verbose assertions (`require` stops the test immediately on failure, `assert` continues — use `require` for setup preconditions).

## General notes for other typed languages (C#, Rust, etc.)
- C#: xUnit/NUnit, `[Theory]` + `[InlineData]` for parameterization, Moq for mocking — same AAA structure applies.
- Rust: `#[test]` functions in a `mod tests`, `#[should_panic(expected = "...")]` for error cases, table-driven via a loop over a `Vec` of cases; mocking usually via trait + fake implementation rather than a mocking framework.
- The structural principles (AAA, one behavior per test, table-driven for input variation, mock only at boundaries, no sleep-based waits) apply regardless of language — only the syntax changes.

---
name: unit-test-writer
description: Write, review, or improve unit tests following modern industry-grade norms (AAA structure, FIRST principles, meaningful coverage over vanity metrics, proper mocking/isolation, edge-case and boundary analysis, table-driven tests, deterministic and fast tests). Use this skill whenever the user asks to "write tests", "add unit tests", "test this function/class/module", "increase coverage", "review my tests", or hands over code and asks for test cases — even if they don't say the word "unit test" explicitly. Also use when the user asks about testing strategy, mocking approach, test naming, or why their tests are flaky/slow/brittle. Supports any language/framework; language-specific idioms are in references/.
---

# Unit Test Writer

A skill for producing unit tests that meet modern, industry-grade engineering norms — not just tests that pass, but tests that catch real bugs, stay readable, and don't rot.

## Core philosophy

1. **Test behavior, not implementation.** A test should describe *what* the unit is supposed to do from the outside (given inputs/state, what output/side-effect/error results), not *how* it does it internally. If refactoring the internals without changing behavior breaks the test, the test is testing the wrong thing.
2. **A failing test should tell a story.** The test name + assertion message should let someone diagnose the bug without reading the test body.
3. **Coverage % is a smell detector, not a goal.** 100% line coverage with weak assertions is worse than 70% coverage with strong ones. Don't write tests to move a coverage number; write tests to catch bugs, then let the number follow.
4. **FIRST principles** — every unit test should be:
   - **F**ast (milliseconds; no real network/DB/sleep)
   - **I**ndependent (no shared mutable state, no dependency on execution order)
   - **R**epeatable (same result every run, every machine — no reliance on system clock, locale, randomness, or external services unless seeded/mocked)
   - **S**elf-validating (pass/fail, no manual log inspection)
   - **T**imely (written close to the code, not months later as an afterthought)

## Workflow

When asked to write tests for a piece of code, follow this sequence — don't skip straight to writing test bodies:

### 1. Identify the unit and its contract
Read the function/class/module under test. Determine:
- Inputs (params, constructor args, injected dependencies, global/env state it reads)
- Outputs (return value, mutated state, side effects, exceptions/errors thrown)
- Explicit contract (types, docstrings, existing usage) and implicit contract (what callers actually rely on)

### 2. Enumerate cases before writing code
Build a checklist covering, at minimum:
- **Happy path** — the obvious expected-use case(s)
- **Boundary values** — empty/zero, min/max, off-by-one (0, 1, -1, length-1, length, length+1), first/last element
- **Invalid/unexpected input** — null/undefined/None, wrong type, empty collections, malformed strings
- **Error handling** — does it throw/return the right error for bad input? Is the error type/message checked, not just "it throws something"?
- **State transitions** — for stateful units, test each meaningful transition and illegal transitions
- **Idempotency / repeatability** — where relevant, calling twice shouldn't double-apply an effect
- **Concurrency edge cases** — only if the unit is meant to be concurrency-safe; don't invent flaky async tests for single-threaded code
- **Regression cases** — if fixing a bug, add the case that reproduces it first (should fail before the fix, pass after)

Do not silently skip categories that don't apply — briefly note why (e.g., "no boundary values; input is a boolean flag").

### 3. Structure every test with AAA (or Given/When/Then)
```
// Arrange — set up inputs, mocks, fixtures
// Act    — call the one thing under test
// Assert — check the one behavior this test is about
```
One logical assertion focus per test. Multiple `expect`/`assert` calls are fine if they're all verifying the same outcome (e.g., checking several fields of one returned object); don't bundle unrelated behaviors into one test just to save typing.

### 4. Name tests so failures are self-explanatory
Prefer `should_<expected behavior>_when_<condition>` or `<method>_<scenario>_<expected result>` or BDD-style nested `describe/context/it` — pick whatever the project's existing tests use; don't introduce a second convention into one codebase. Bad: `test1`, `testUser`. Good: `returns_empty_list_when_no_matches_found`, `throws_ValidationError_when_email_missing_at_symbol`.

### 5. Mock/stub at the right boundary
- Mock **external, non-deterministic, or slow** dependencies: network calls, databases, filesystem, system clock, random number generators, third-party SDKs.
- Do **not** mock the thing you're actually testing, or mock so deeply that the test just re-asserts the mock's return value (a test that passes even when the real implementation is deleted is worthless).
- Prefer dependency injection / seams over monkey-patching internals when the language supports it.
- For time: inject a clock or freeze time (e.g., `freezegun`, `sinon.useFakeTimers`, `Clock` interface) — never `sleep()` in a unit test to "wait" for something.
- For randomness: seed it, or inject a source of randomness that can be replaced with a fixed sequence.
- Verify mock interactions (was it called, with what args, how many times) only when *that call* is the behavior under test — not as a reflex on every test.

### 6. Use table-driven / parameterized tests for input variation
When testing the same logic across many inputs, use the framework's parameterization feature (`pytest.mark.parametrize`, `it.each`, JUnit `@ParameterizedTest`, Go table tests) instead of copy-pasting near-identical test functions. Keep each row labeled so failures show which case failed.

### 7. Write the tests, then run them
- Generate the test file in the project's existing test location/naming convention (check for an existing `tests/`, `__tests__/`, `*_test.go`, `*.test.ts`, `test_*.py` pattern before inventing a new one).
- **Actually run the test suite** after writing it. A test that hasn't been executed is a draft, not a deliverable.
- Confirm: (a) new tests pass against current code, (b) for at least the key cases, temporarily verify they'd *fail* against a broken version if you're not sure the assertion is meaningful (this catches "tests that can never fail").
- Fix any tests that fail for the wrong reason (bad setup, wrong mock) before reporting done.

### 8. Report coverage honestly
If a coverage tool is available, run it and report the number, but pair it with a note on what's *not* covered and whether that's acceptable (e.g., "generated getters excluded" vs. "error path at line 42 untested — recommend adding").

## Anti-patterns to avoid

- **Testing implementation details**: asserting private method call order, internal variable names, or exact internal data structures instead of observable behavior.
- **Brittle snapshot/golden tests** used as a substitute for thinking about assertions — fine for stable serialization output, bad as a catch-all for logic with clear expected values.
- **Interdependent tests**: test B only passes if test A ran first and left state behind. Each test must set up its own world.
- **Overmocking**: mocking so much that the test only proves your mocks are configured correctly, not that the code works.
- **Assertion roulette**: many unrelated assertions in one test with no message, so a failure doesn't say what actually broke.
- **Sleep-based waiting** in async tests instead of proper awaiting/fake timers/polling with timeout.
- **Ignoring flaky tests** by retrying until green instead of fixing the nondeterminism (unseeded random, real time, shared state, race conditions).
- **One giant "test everything" test function** instead of small, independently readable tests.
- **Copy-pasted test bodies** with only a literal changed — use parameterization instead.

## Test doubles — quick vocabulary (use precisely, not interchangeably)
- **Dummy**: passed to satisfy a signature, never actually used.
- **Stub**: returns canned answers to calls made during the test, no verification of how it was called.
- **Mock**: like a stub, but the test asserts *how* it was called (args, count).
- **Fake**: a working but simplified implementation (e.g., in-memory DB instead of real one).
- **Spy**: wraps a real object and records calls while still delegating to real behavior.

## Framework-specific idioms

Load the relevant reference file for concrete syntax and conventions before writing code in that language:
- `references/javascript-typescript.md` — Jest / Vitest / Testing Library
- `references/python.md` — pytest
- `references/jvm-go-other.md` — JUnit5/Mockito, Go `testing` + table tests, and general notes for other statically-typed languages

If the project already has tests, mirror its existing framework, style, and file layout rather than the reference defaults — consistency with the codebase beats textbook convention.

## Output checklist before declaring done

- [ ] Every enumerated case from step 2 has a corresponding test (or a documented reason it's skipped)
- [ ] Tests actually executed and passing
- [ ] No test depends on execution order or leftover state from another test
- [ ] No real network/filesystem/sleep calls
- [ ] Names are descriptive enough to debug from a CI failure log alone
- [ ] Mocks are at the system boundary, not wrapping the unit under test itself
- [ ] Coverage gaps (if any) called out explicitly, not silently left

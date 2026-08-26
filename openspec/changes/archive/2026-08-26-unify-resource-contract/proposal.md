## Why

Queryloom supports both bundled project-local data and browser-fetched external data, but some onboarding wording still presents local files as the only normal path. Agents need one unambiguous contract to choose the right resource mode and explain its deployment consequences.

## What Changes

- Align the README, scaffold hints, build guide, validation messages, and reference example around the same `path` or `url` resource contract.
- Make the build-time copy versus runtime CORS fetch behavior and supported formats explicit.
- Add regression coverage for the documented resource modes without adding connectors or changing the public dashboard contract.

## Capabilities

### New Capabilities

- `resource-contract-documentation`: Agent-facing documentation and scaffold guidance for project-local and external static dashboard resources.

### Modified Capabilities

- None.

## Impact

- Affects CLI guide/scaffold copy, README, reference project documentation, and focused tests.
- Keeps the two authored files and static deployment model unchanged; remote databases and connector abstractions remain out of scope.

# Validator Locale Matrix

Current coverage for `validateCellphoneNumber`, `validatePostalCode`, and `validateAddressDirection`.

- `US`: phone + postal
- `CO`: phone + postal
- `MX`: phone + postal
- `ES`: phone + postal
- `AR`: phone + postal
- `CL`: phone + postal
- `PE`: phone + postal
- `BR`: phone + postal
- `CA`: phone + postal
- `UY`: phone + postal
- `GB`: phone + postal
- `DE`: phone + postal
- `ANY`: phone-only preset

`validatePostalCode` is country-aware with `validatePostalCode(value, { country })`.

Address direction locales:

- `en`: `N, S, E, W, NE, NW, SE, SW` + full words
- `es`: `N, S, E, O, NE, NO, SE, SO` + full words

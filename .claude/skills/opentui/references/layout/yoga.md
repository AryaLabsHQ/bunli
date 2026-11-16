# Yoga Layout

OpenTUI uses Facebook's Yoga layout engine (Flexbox).

## Flexbox Properties

### Direction

```typescript
box.flexDirection = "row"; // horizontal
box.flexDirection = "column"; // vertical (default)
```

### Wrapping

```typescript
box.flexWrap = "wrap"; // allow wrapping
box.flexWrap = "no-wrap"; // default
```

### Alignment

```typescript
box.alignItems = "flex-start"; // default
box.alignItems = "center";
box.alignItems = "flex-end";
box.alignItems = "stretch";

box.justifyContent = "flex-start";
box.justifyContent = "center";
box.justifyContent = "flex-end";
box.justifyContent = "space-between";
box.justifyContent = "space-around";
box.justifyContent = "space-evenly";
```

### Gap

```typescript
box.gap = 4; // both row and column
box.rowGap = 4; // only row
box.columnGap = 4; // only column
```

## Sizing

```typescript
box.width = 100;
box.height = "auto"; // content-based
box.minWidth = 50;
box.maxWidth = 200;

box.flexGrow = 1; // fill available space
box.flexShrink = 0; // don't shrink below min
box.flexBasis = "auto";
```

## Positioning

```typescript
box.position = "relative"; // default
box.position = "absolute"; // relative to parent

box.top = 10;
box.right = 10;
box.bottom = 10;
box.left = 10;
```

## Margin & Padding

```typescript
box.margin = 4; // all sides
box.marginTop = 4;
box.marginRight = 4;
box.marginBottom = 4;
box.marginLeft = 4;

box.padding = 4;
box.paddingTop = 4;
box.paddingRight = 4;
box.paddingBottom = 4;
box.paddingLeft = 4;
```

## Percentage Values

```typescript
box.width = "50%"; // 50% of parent
box.height = "100%";
box.top = "25%";
```

## Overflow

```typescript
box.overflow = "visible"; // default
box.overflow = "hidden";
box.overflow = "scroll";
```

# Durak Online - Design Guidelines

## Design Approach: Reference-Based Replication
**Primary Reference**: RST Games Durak Online (durak.rstgames.com)
**Objective**: Create a pixel-perfect clone matching the original's visual design, interactions, and feel

## Visual Aesthetic

### Background Treatment
- **Main background**: Rich blue gradient with subtle diagonal texture pattern
- **Card table**: Traditional green felt texture for in-game playing surface
- **Overlays**: Semi-transparent dark backgrounds for modals/panels

### Card Design
- **Style**: Traditional Russian playing card illustrations with ornate Jack/Queen/King artwork
- **Size**: Standard playing card proportions (maintain 5:7 aspect ratio)
- **Back design**: Blue geometric pattern matching traditional Durak card backs
- **Trump indicator**: Small suit symbol overlay on trump card

## Layout System

### Spacing Units
Primary Tailwind spacing: **2, 3, 4, 6, 8, 12** (e.g., p-4, gap-6, mb-8)

### Main Screens

**Lobby Screen**:
- Full viewport height with background
- Top bar: User info (coins, level) right-aligned
- Game list: Scrollable central area with game cards in grid
- Bottom nav: Fixed 4-tab navigation (Профиль, Открытые, Приватные, Создать игру)

**Game Creation**:
- Modal overlay centered on screen
- Stake slider with value display (100 to 10M range)
- Grid of game mode toggle buttons
- Player count selector (2-6 players)
- Deck size chips (24/36/52)

**Active Game Table**:
- Centered card table on green felt background
- Player positions: Bottom (user), top (opponent), sides (additional players)
- Deck position: Top center with visible trump card
- Discard pile: Top center (under deck)
- Action buttons: Bottom center (Бито, Беру, Готов)

## Typography

### Font Stack
- **Primary**: System sans-serif with Cyrillic support (SF Pro, Roboto, -apple-system)
- **Weights**: Regular (400), Medium (500), Bold (700)

### Hierarchy
- **H1** (Game titles): 24px, bold
- **H2** (Section headers): 20px, medium  
- **Body** (Game info, labels): 14px-16px, regular
- **Small** (Stakes, card counts): 12px-14px, regular
- **Buttons**: 14px-16px, medium

## Component Library

### Game Card (Lobby)
- Rounded corners (rounded-lg)
- White background with subtle shadow
- Header: Stakes display (bold, prominent)
- Body: Player count (1/2, 2/3, etc.), game mode icons
- Footer: Game settings indicators (deck size, speed)
- Hover: Slight lift effect with stronger shadow

### Filter Panel
- Slide-in panel from right or bottom
- Dark semi-transparent overlay behind
- White panel with sections for each filter type
- Range sliders for stake amounts
- Checkbox groups for modes and settings
- Clear/Apply button row at bottom

### Card Components
- **Playing cards**: Full card graphics with suit/rank visible
- **Card back**: When face-down
- **Hover state**: Slight lift (translate-y-2) on interactive cards
- **Selected**: Raised position and subtle glow
- **Trump card**: Rotated 90° in deck display

### Action Buttons
- **Primary** (Создать, Готов): Bold gradient background, white text, rounded-lg
- **Secondary** (Бито, Беру): Outlined or solid with opacity
- **Disabled state**: Reduced opacity, no interaction
- **Sizes**: Large (in-game actions), Medium (navigation), Small (filters)

### Navigation Tabs (Bottom)
- Fixed bar at bottom of viewport
- 4 equal-width tabs with icons + labels
- Active tab: Highlighted background, bold text
- Inactive: Muted opacity

### Modals & Overlays
- Dark overlay: bg-black/50
- Modal container: White rounded card, centered
- Close button: Top-right X icon
- Max width: max-w-2xl for settings, max-w-md for confirmations

## Interaction Patterns

### Card Interactions
- **Click to select**: Card raises and highlights
- **Drag-and-drop**: Optional for playing cards to table
- **Valid move highlighting**: Subtle glow on playable cards
- **Invalid moves**: Red shake animation

### Game Flow Animations
- **Card dealing**: Smooth slide from deck to player position (300ms ease-out)
- **Card playing**: Slide to table center (250ms)
- **Card beating**: Defender's card slides over attacker's card
- **Taking cards**: All table cards slide to defender (400ms)
- **Win/loss**: Currency change flies from table to balance (+480/-500)

### Lobby Interactions  
- **Game list**: Smooth scroll, infinite load on scroll bottom
- **Filter panel**: Slide transition (300ms)
- **Tab switching**: Instant content swap with fade

## Special Elements

### Currency Display
- **Position**: Top-right corner
- **Format**: Coin icon + number (e.g., "500")
- **Animations**: Number count-up on change, particle effect on win

### Player Indicators
- **Avatar circle**: Small circular frame with player image/icon
- **Card count badge**: Number overlay on player position
- **Active player**: Glowing border or highlight
- **Turn timer**: Circular progress indicator

### Deck & Trump Display
- Deck stack: Slightly fanned cards showing depth
- Trump card: Visible underneath deck, rotated 90°
- Card count: Small badge on deck

## Game Table Layout

**Card Positions**:
- **User hand**: Arc at bottom, cards slightly overlapping
- **Played cards**: Central table area in organized rows
- **Attack/defense pairs**: Stacked vertically, defender's card slightly offset on top
- **Discard area**: Neat stack, top card visible

**Responsive Behavior**:
- Mobile: Simplified 2-player layout, larger tap targets
- Tablet: Full layout with adjusted spacing
- Desktop: Maximum detail, all player positions visible

## Images

**Background Textures**:
- Blue diagonal texture pattern for main background
- Green felt texture for game table
- Subtle noise/grain overlay for depth

**Card Graphics**: 
- Full 36-card deck (6-Ace, 4 suits) with traditional Russian artwork
- Card back design with blue geometric pattern
- High-resolution PNG or SVG for crisp rendering at all sizes

**Icons**:
- Game mode icons (Подкидной, Переводной, etc.)
- Navigation tab icons  
- Coin/currency icon
- Settings/filter icons
- Use Heroicons or similar clean icon set
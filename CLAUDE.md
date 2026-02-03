# JavaScript Mastery Development Guidelines

This document outlines the coding standards, principles, and processes that define how we build educational content at JavaScript Mastery.

## Core Philosophy

We are not just shipping code to production—we are using code as a medium of knowledge transfer. Every line of code must be:

- **Clean**: Simple to understand, simple to write
- **Educational**: Easy to explain line by line
- **Optimized**: Not the shortest or hackiest, but the cleanest
- **Non-duplicated**: Follow DRY principles strictly

> "I want to confidently go through the code and explain every single line like it is the best line of code you have ever written."

---

## Code Quality Standards

### 1. Eliminate Verbose and Repetitive Code

**Bad Example:**

```javascript
// ❌ Verbose, repetitive, hard to explain
const openSafari = () => set((state) => ({ ...state, safari: true }));
const openFinder = () => set((state) => ({ ...state, finder: true }));
const openTerminal = () => set((state) => ({ ...state, terminal: true }));
const openContacts = () => set((state) => ({ ...state, contacts: true }));
// ... repeated for every window
```

**Good Example:**

```javascript
// ✅ Clean, reusable, easy to understand
const openWindow = (windowKey, data) => {
  set((state) => {
    const window = state.windows[windowKey];
    window.isOpen = true;
    window.zIndex = state.nextZIndex;
    window.data = data;
    state.nextZIndex++;
  });
};
```

### 2. Avoid Magic Numbers

Extract constants with meaningful names:

```javascript
// ❌ Magic number - what does 1000 mean?
zIndex: 1000;

// ✅ Clear intent
const INITIAL_Z_INDEX = 1000;
zIndex: INITIAL_Z_INDEX;
```

### 3. Proper State Management

When using Zustand, use selectors for referential stability:

```javascript
// ❌ Object recreation causes unnecessary re-renders
const { openFinder, closeFinder } = useApplicationStore((state) => ({
  openFinder: state.openFinder,
  closeFinder: state.closeFinder,
}));

// ✅ Best practice: Use individual selectors for stable references
const openFinder = useApplicationStore((state) => state.openFinder);
const closeFinder = useApplicationStore((state) => state.closeFinder);

// ✅ Alternative: Direct destructuring works when store actions are defined
// outside the state and don't cause re-renders
const { openFinder, closeFinder } = useApplicationStore();
```

### 4. Eliminate Switch Statement Anti-Patterns

```javascript
// ❌ Duplicated logic in switch cases
const handleClick = (type) => {
  switch (type) {
    case 'finder':
      openFinder();
      break;
    case 'safari':
      openSafari();
      break;
    case 'contacts':
      openContacts();
      break;
    // ... endless repetition
  }
};

// ✅ Generic function
const openApp = (windowKey) => openWindow(windowKey);
```

### 5. Use Libraries Over Custom Code

Leverage well-established packages (millions of weekly downloads) instead of reinventing the wheel:

| Instead of...                  | Use...               |
| ------------------------------ | -------------------- |
| Custom date formatting         | `dayjs`              |
| Manual tooltip positioning     | `react-tooltip`      |
| Complex state spread operators | `immer` with Zustand |
| Custom PDF generation          | `react-pdf`          |
| Manual component styling       | `shadcn/ui`          |

**Example:** dayjs replaces 50+ lines of custom date code with a single line.

### 6. Higher-Order Components for Shared Logic

When multiple components share the same functionality (dragging, focusing, opening/closing animations), use a wrapper component:

```javascript
// ✅ Window wrapper handles all shared logic
const WindowWrapper = ({ children, windowKey }) => {
  const { isOpen, zIndex } = useWindowStore(windowKey);
  const { handleDragStart, handleFocus } = useWindowHandlers(windowKey);

  if (!isOpen) return null;

  return (
    <div
      className="window"
      style={{ zIndex }}
      onMouseDown={handleFocus}
      onDragStart={handleDragStart}
    >
      {children}
    </div>
  );
};

// Individual windows only contain their unique JSX
const TerminalWindow = () => (
  <WindowWrapper windowKey="terminal">
    <TerminalHeader />
    <TerminalPrompt />
  </WindowWrapper>
);
```

### 7. Separation of Concerns

- Split stores by functionality (windows store, location store, etc.)
- Keep components focused on single responsibilities
- Extract constants to dedicated files

---

## Naming Conventions

- Use clear, descriptive variable names
- Avoid generic names like `test`, `data`, `temp`
- Let AI tools (ChatGPT) suggest human-readable names based on context
- Variable names should make the code self-documenting

```javascript
// ❌ Unclear
const x = 1 + 0.25 * Math.exp(-d * d);

// ✅ Self-documenting
const intensity = 1 + MAGNIFICATION_FACTOR * Math.exp(-distance * distance);
const scale = BASE_SCALE + intensity * SCALE_MULTIPLIER;
```

---

## Refactoring Mindset

Always ask yourself:

1. How can I make this shorter?
2. How can I make this easier to understand?
3. How can I make this easier to manage?
4. Is there a package that does this better?

**Use AI tools for refactoring:**

- Share working code with ChatGPT
- Ask: "Make it cleaner, more concise, but also easier to understand"
- Ask: "Improve naming"
- Ask: "Are there too many spread operators? Is there a better way?"

---

## Documentation & Recording Guidelines

### Recording Documentation Structure

Documentation is NOT just code comments—it's the step-by-step guide for recreating the development process.

**Key Principles:**

1. **Introduce concepts when they're used**, not before

   - Don't install 10 libraries at the start
   - Introduce each library/concept right before it's needed

2. **Explain the "why"**, not just the "what"

   - Why did you choose this approach?
   - What alternatives didn't work?
   - What bugs did you encounter?

3. **Document the struggle**

   - Share failed attempts that led to the solution
   - Note non-obvious gotchas and edge cases

4. **Treat the reader as a beginner**

   - Even if something seems obvious to you, explain it
   - One missing line can cost hours of debugging

5. **Provide constants/mock data at point of use**

   ```javascript
   // ❌ Provide all constants at the start
   import { NAV_LINKS, APP_DATA, WINDOW_CONFIG } from './constants';

   // ✅ Provide constants right before mapping over them
   // (now introduce NAV_LINKS)
   {NAV_LINKS.map(link => ...)}
   ```

---

## Project Development Order

Structure video builds to maximize early visual impact:

1. **Start with visible, exciting features** - Give viewers immediate dopamine
2. **Use mock data first** - Display realistic content before implementing CRUD
3. **Delay boring setup** - Don't start with auth if it takes 30 minutes
4. **80/20 Rule** - 20% of features for 80% of the wow factor

**Example Build Order for Mac OS Portfolio:**

1. ✅ Navbar (simple, visual)
2. ✅ Welcome screen with background animation (immediate wow)
3. ✅ Dock with hover effects (core interaction)
4. ❌ Authentication (later, if needed)

---

## Visual & Content Standards

### No Placeholder Content

Never use:

- Lorem ipsum
- Broken or placeholder images
- Generic names like "test", "user1"
- Random gibberish data

**Always use:**

- Real (but fake) data that makes sense
- Properly formatted images
- Pop culture references or funny examples
- Professional-looking mock content

```javascript
// ❌ Boring, meaningless
const user = { name: 'Test User', role: 'test' };

// ✅ Memorable, engaging
const user = { name: 'Jon Snow', car: 'Aston Martin' };
```

### Demo Examples Should Be Award-Worthy

Even simple tutorials should use professional visuals:

- Reference Awwwards-winning websites for design inspiration
- Combine simple concepts with beautiful execution
- A scroll animation demo should look like it belongs on a real site

---

## Feature Scope Management

### The Balance

Every project must balance:

- **Wow Factor**: Visual appeal and impressiveness
- **Time to Build**: Respect viewer's time investment
- **Educational Value**: What they actually learn
- **Complexity**: Code should remain understandable

### When to Remove Features

Remove features that:

- Take 80% of time but add only 20% value
- Require complex logic for minimal visual impact
- Are difficult to explain clearly
- Break the project's time budget

### Speaking Up

**You are empowered to push back on feature requests.**

If a feature doesn't make sense:

- Explain why it lowers quality
- Suggest alternatives
- Propose what could be done instead

> "Don't just listen and implement. Tell me 'I don't think it's the best way to do it. Here are the reasons why, and here's what we can do instead.'"

---

## Ownership Mentality

Don't just write code because you're asked to. Own your work by:

1. **Thinking critically** about project direction
2. **Suggesting improvements** to features and approach
3. **Contributing to positioning** (thumbnails, titles, hooks)
4. **Understanding the viewer** and what excites them
5. **Balancing education and entertainment**

Ask yourself:

- Would I click on this video?
- Would I be excited to build this project?
- What would make this more engaging?

---

## Quality Checklist

Before submitting code for review:

- [ ] No duplicate code blocks
- [ ] No magic numbers without named constants
- [ ] No unnecessary object recreation in hooks
- [ ] Libraries used where appropriate
- [ ] Higher-order components for shared logic
- [ ] Clear, descriptive naming
- [ ] No Lorem ipsum or placeholder content
- [ ] Features introduced at point of use
- [ ] Documentation explains the "why"
- [ ] Failed attempts and gotchas documented
- [ ] Build order prioritizes visual impact

---

## Remember: Impact

We've helped millions of developers:

- Land their first jobs
- Escape poverty through new skills
- Build projects they're proud of
- Understand concepts that seemed impossible

Every line of code, every explanation, every tutorial has the potential to change someone's life. That's why quality matters.

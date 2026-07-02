Design and implement a premium login screen for a finance application called **C-Vault**. The login method should mimic a real mechanical bank vault combination lock instead of using a PIN pad or password.

# Theme

The interface should feel secure, premium, luxurious, and minimalist.

Color Palette:
- Primary Dark: #014134
- Primary Green: #00684F
- Accent Mint: #2ED8A5
- Background: #0B0F10
- Text: White
- Secondary Text: #A8B3AF

Use subtle shadows, soft green glow effects, and smooth animations. Avoid excessive textures except for the vault dial itself.

---

# Layout

Top Section

Display:

C-VAULT

Unlock Your Vault

Below the title, show a progress indicator.

Initial state:

○ ○ ○ ○

Each circle represents one number in the vault combination.

When a number is accepted:

● ○ ○ ○

Then:

● ● ○ ○

Then:

● ● ● ○

Finally:

● ● ● ●

Do not display previously entered numbers.

Only show progress.

---

Current Number Display

Place a large number above the vault dial.

Example:

12

This number updates continuously while the dial rotates.

Only the CURRENT number is visible.

Previously entered numbers disappear after being accepted.

---

Vault Dial

Place a large circular vault combination dial in the center.

Requirements:

- Metallic finish
- Numbers from 00–99
- Fine engraved tick marks
- Green indicator pointer fixed at the top
- User rotates the dial with one finger
- Smooth inertia while spinning
- Snaps slightly as each number passes
- Small haptic feedback every number crossed
- Realistic mechanical movement
- 60 FPS animation

The dial should be the main focus of the screen.

---

Bottom Text

Default:

Rotate to the correct number

When a number is accepted:

Number Accepted

Rotate to the next number

---

Forgot Combination

Place a "Forgot Combination?" button at the bottom.

---

# Interaction Logic

The user previously created a vault combination.

Example:

12
37
84
25

The app stores this securely.

When opening the app:

Progress:

○ ○ ○ ○

Current Number:

00

---

User rotates the dial.

Current number updates continuously.

Example:

00

01

02

03

...

11

12

When the dial reaches the correct number:

Wait approximately 500ms while the dial remains still.

Automatically accept the number.

Do NOT require pressing a confirm button.

Trigger:

• Soft metallic click sound
• Light haptic feedback
• Green glow animation
• Scale animation on the current number

The first progress indicator fills.

Progress:

● ○ ○ ○

The accepted number disappears.

Current number resets to:

00

The user immediately rotates for the next number.

Repeat the process.

Second:

37

Progress:

● ● ○ ○

Third:

84

Progress:

● ● ● ○

Fourth:

25

Progress:

● ● ● ●

---

Incorrect Number

If the user pauses on the wrong number:

Show:

Incorrect Number

Shake the dial slightly.

Play a subtle error vibration.

Wait one second.

Reset:

○ ○ ○ ○

Current number:

00

---

Success Animation

When all four numbers are entered correctly:

Trigger:

• Green glow around the dial
• Metallic vault unlocking sound
• Dial rotates slightly
• Screen vibrates softly
• Progress circles animate into checkmarks

Display:

Vault Unlocked

Welcome Back

After one second, smoothly transition to the dashboard.

---

Security

Never display completed numbers after they are accepted.

Only show progress circles.

Store the combination using a secure hash.

Limit failed attempts.

Lock the vault temporarily after multiple failed attempts.

Support biometric unlock (Face ID / Fingerprint) after the first successful login.

---

Animation Style

The interaction should feel satisfying and premium.

Use:

• Smooth easing
• Realistic rotational inertia
• Tiny metallic clicks
• Soft green confirmation glow
• High-quality micro-interactions
• No flashy effects
• Native 60 FPS animations

The experience should feel like opening a real bank vault.

---

Inspiration

Take inspiration from:

- Apple Human Interface Guidelines
- Revolut
- Monzo
- Mechanical bank vault combination locks

The final result should be clean, elegant, immersive, and worthy of a premium finance application.

Focus heavily on polished animations and micro-interactions while keeping the interface minimalist.


# Walkthrough - D2R Multiplay v2.6.0 (Bento & Personal Update)

This release focuses on **visual density**, **personalization**, and **interaction fluidity**. We have moved away from the wide-bar lists of the past to a more modern, structured interface.

## 🚀 Key Features in v2.6.0

### 1. Bento-Style Dashboard (3-Column Grid)
- **Compact Cards**: Accounts are now displayed in a 3-column grid (on standard windows), giving it a tidy "Bento box" aesthetic.
- **Visual Status**: Each card features live process monitoring dots (Blue for Battle.net, Emerald for D2R).
- **High-Contrast Info**: Account names and notes are significantly bolder and larger for immediate readability.

### 2. High-Density Horizontal List
- **Single-Line Row**: For users with many accounts, the "List" mode provides a streamlined horizontal row where Avatar, User, Bnet ID, and Notes are all visible at a glance without vertical bloat.

### 3. Personal Avatars & Identity
- **Built-in Library**: Choose from high-quality class placeholders (Ama, Sor, Nec, etc.).
- **Custom Uploads**: Supports local image uploads. The app automatically converts the image to **Base64** and stores it within your `config.json`.
- **Portability**: Since avatars are stored as strings in your config, they move with your app folder—no broken image links.

### 4. Drag-and-Drop Reordering
- **Dnd-Kit Powered**: You can now reorder your accounts by simply grabbing the handle (or dragging the card) and moving it to your preferred position.
- **Persistent Order**: Sorting is saved automatically to the backend.

### 5. Schema Cleanup
- **Removed Region**: The dedicated "Region" field has been removed to reduce clutter, as users typically manage regions via the Battle.net launcher or specific account notes.

---

## 🛠 Build & Installation (Portable)

This application is distributed as a **Portable ZIP**. 
- **Main Binary**: `D2R_Multiplay.exe`
- **Config Store**: All settings are saved in `%APPDATA%/d2r-multiplay/config.json`.

**Latest Package**: `D2R_Multiplay_Portable_v2_6_0.zip`

---

## 💡 Quick Tips
- **Host Account**: The account marked **(Host)** typically represents your current Windows session and does not require a password to launch.
- **PIN vs Password**: Always use your **real Windows login password**. PIN codes and Windows Hello bio-metrics are not supported by the underlying Windows `CreateProcessWithLogonW` API.
- **Reset Avatar**: Use the "Reset" button in the Account Modal to return to the default user icon.

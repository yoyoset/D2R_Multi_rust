# User Guide - D2R Multiplay v0.3.7

D2R Multiplay is a high-performance, secure multi-instance manager for *Diablo II: Resurrected*, rebuilt from the ground up in Rust for maximum efficiency.

---

## 🚀 Key Features

### 1. Advanced Multi-Account Mode (New)

For power users managing multiple regions or account types, this mode provides a dual-button interface:

- **One-click Start**: Performs the full identity swap and launches the game immediately.
- **Bnet Client Only**: Switches the environment (credentials/snapshots) but only opens the Battle.net launcher. This is perfect for manual region selection or updating.

### 2. High-Density Dashboard

The dashboard adapts to your workflow with two distinct view modes:

- **Card Mode (Bento Style)**: Visual, touch-friendly grid with live status indicators (Blue = Bnet Active, Emerald = D2R Active).
- **List Mode**: Ultra-high density view for management of 10+ accounts on a single screen.

### 3. Drag-and-Drop Organization

Reorder your accounts easily using the integrated drag handles. Your custom order is automatically saved and synced with the backend.

### 4. Smart Identity Swapping

The app manages your `product.db` files behind the scenes. Every time you launch an account, the app ensures your specific login token is restored, preventing "last-signed-in-user" confusion.

---

## 🛠 Usage & Tips

### Getting Started

1. **Administrator Required**: Right-click `d2r-rust.exe` and select **Run as Administrator**. This is strictly required for process isolation and mutual exclusion (Mutex) manipulation.
2. **Add Windows Users**: Each account must correspond to a Windows User. Use the **Tools** view to quickly create new Windows users if needed.
3. **Configure Path**: Set your `D2R.exe` path in the Settings modal.

### Troubleshooting

- **Game Update Permissions**: Since isolation accounts are standard users, they may lack permission to update game files in `C:\Program Files`. **Tip**: Right-click your game folder -> Properties -> Security -> Edit -> Grant "Full Control" to the **Users** group.
- **Ghost Icons (👻)**: If an account shows a ghost icon, it means the Windows user specified in your config no longer exists on this system.
- **Launch Conflicts**: If the app detects an existing session for the target account, it will offer to resolve it automatically.
- **Atomic Logs**: Use the logs at the bottom of the dashboard to trace exactly what's happening during the setup sequence.

---

## ⚙️ Build from Source

Ensure you have Rust and Node.js (v18+) installed.

```bash
npm install
npm run tauri dev   # Development
npm run tauri build # Production (Builds portable EXE)
```

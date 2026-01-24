use windows::Win32::Foundation::{CloseHandle, HANDLE};

#[derive(Debug)]
#[allow(dead_code)]
pub struct HandleGuard(pub HANDLE);

impl Drop for HandleGuard {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }
}

// Ensure HandleGuard is Send but NOT Sync (handles are thread-specific or need care)
// Actually, raw HANDLEs are typically Send.
unsafe impl Send for HandleGuard {}

#[allow(dead_code)]
impl HandleGuard {
    pub fn new(handle: HANDLE) -> Self {
        Self(handle)
    }

    pub fn is_valid(&self) -> bool {
        !self.0.is_invalid()
    }
    
    pub fn raw(&self) -> HANDLE {
        self.0
    }
}

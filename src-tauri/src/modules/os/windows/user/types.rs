use serde::{Deserialize, Serialize};
use windows::core::PWSTR;

#[repr(C)]
pub struct USER_INFO_1003_INTERNAL {
    pub usri1003_password: PWSTR,
}

#[repr(C)]
#[derive(Copy, Clone, Debug)]
pub struct USER_INFO_1008_INTERNAL {
    pub usri1008_flags: u32,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowsUser {
    pub name: String,
    pub is_current: bool,
    pub is_initialized: bool,
    pub is_ms_account: bool,
}

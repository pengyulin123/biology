/* =========================================================
   Supabase 配置
   ---------------------------------------------------------
   把下面两行换成你自己项目的值：
   Supabase 控制台 → Project Settings → API
     - Project URL          → SUPABASE_URL
     - anon / public key    → SUPABASE_ANON_KEY

   anon key 是「公开的浏览器密钥」，放在前端是 Supabase 的设计，
   配合行级安全（RLS）才安全。绝对不要把 service_role key 放进来。
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: "",          // 例如 https://abcdefghijkl.supabase.co
  anonKey: "",      // 例如 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....

  table: "user_data"   // 建表脚本里的表名，一般不用改
};

// Tokens stay in the URL fragment (never sent to the web host), then in memory only.
// Nothing is redeemed automatically: link previews cannot consume an invitation.
const params=new URLSearchParams(location.hash.slice(1));
let token=params.get('token_hash'),type=params.get('type'),client=null,busy=false;
history.replaceState(null,'',location.pathname);
const $=id=>document.getElementById(id),valid=token&&/^[a-f0-9]{40,128}$/i.test(token)&&['invite','recovery'].includes(type);
function status(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
async function sdk(){
 if(!client){
  const {createClient}=await import('./auth-client.js');
  client=createClient('https://kvhlrgzgjndecgayyaeb.supabase.co','sb_publishable_0sQTdIubJvenITHUPdIMkg_YfaPZZtB',{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
   global:{fetch:(url,opts={})=>fetch(url,{...opts,signal:opts.signal||AbortSignal.timeout(15000)})}
  });
 }
 return client;
}
if(valid){$('welcome').hidden=false;status('Undangan siap. Lanjutkan untuk membuat kata sandi akun game.');}
else status('Buka tautan aktivasi pribadi dari pengelola Kopi Kecil. Tautan ini tidak lengkap atau tidak valid.',true);
$('activate').addEventListener('click',async()=>{
 if(busy||!valid)return;busy=true;$('activate').disabled=true;status('Memeriksa undangan…');
 try{
  const c=await sdk(),{data,error}=await c.auth.verifyOtp({token_hash:token,type});
  if(error){
   if(['otp_expired','access_denied'].includes(error.code)){
    token=null;$('welcome').hidden=true;status('Tautan sudah dipakai atau kedaluwarsa. Minta tautan aktivasi baru kepada pengelola.',true);return;
   }
   throw Error('verify');
  }
  if(!data.session?.access_token||!data.user?.email)throw Error('session');
  token=null;type=null;$('email').value=data.user.email;$('welcome').hidden=true;$('password-form').hidden=false;
  status('Undangan diterima. Buat kata sandi untuk akunmu.');$('password').focus();
 }catch{status('Belum tersambung. Periksa internet dan coba lagi. Jika tautan sudah terpakai, minta tautan baru.',true);}
 finally{busy=false;$('activate').disabled=false;}
});
$('password-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 const password=$('password').value;
 if(password.length<12||password.length>200){status('Gunakan kata sandi 12–200 karakter.',true);return;}
 if(password!==$('confirm-password').value){status('Kedua kata sandi belum sama. Periksa kembali.',true);$('confirm-password').focus();return;}
 busy=true;$('save').disabled=true;status('Menyimpan kata sandi…');
 try{
  const c=await sdk(),{data,error}=await c.auth.updateUser({password});
  if(error){
   if(error.code==='weak_password'){status('Kata sandi terlalu mudah ditebak. Coba kata sandi yang lebih kuat.',true);return;}
   if(error.code==='same_password'){status('Kata sandi ini sudah pernah tersimpan. Gunakan kata sandi lain, atau coba masuk di aplikasi dengan kata sandi tadi.',true);return;}
   if(['session_not_found','refresh_token_not_found','bad_jwt'].includes(error.code)){status('Sesi aktivasi berakhir. Minta tautan baru kepada pengelola.',true);return;}
   throw Error('update');
  }
  if(!data.user?.email)throw Error('user');
  $('login-email').textContent=data.user.email;$('password-form').reset();$('password-form').hidden=true;$('done').hidden=false;
  status('Kata sandi tersimpan. Sekarang masuk dari aplikasi Kopi Kecil.');
  // No session persists on this support site. Only this activation session is signed out.
  await c.auth.signOut({scope:'local'}).catch(()=>{});client=null;
 }catch{status('Hasil penyimpanan belum terkonfirmasi. Periksa internet lalu coba lagi. Jika kata sandi sudah tersimpan, kamu dapat masuk dari aplikasi.',true);}
 finally{busy=false;$('save').disabled=false;}
});
